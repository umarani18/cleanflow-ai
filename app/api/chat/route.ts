import { NextRequest, NextResponse } from 'next/server'

const PINECONE_API_KEY = process.env.PINECONE_API_KEY!
const PINECONE_ASSISTANT_URL = 'https://prod-1-data.ke.pinecone.io/assistant/chat/cleanflowai-assistant'

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Build messages array for Pinecone Assistant
    const messages = [
      ...conversationHistory.slice(-6).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ]

    // Call Pinecone Assistant API
    const response = await fetch(PINECONE_ASSISTANT_URL, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        stream: false,
        model: 'gpt-4o',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pinecone Assistant error:', response.status, errorText)
      throw new Error(`Pinecone API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Extract the assistant's reply
    const reply = data.message?.content || data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.'

    return NextResponse.json({ 
      reply,
      sources: data.citations || []
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
