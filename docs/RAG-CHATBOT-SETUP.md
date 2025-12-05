# RAG Chatbot Setup Guide

This guide explains how to set up and use the CleanFlowAI RAG (Retrieval-Augmented Generation) chatbot.

## Overview

The chatbot uses:
- **Groq** (Llama 3.1-70B) for chat completions via OpenAI-compatible API
- **HuggingFace** (all-MiniLM-L6-v2) for FREE embeddings - no API key required!
- **Pinecone** for vector storage and similarity search
- **Next.js API Routes** for secure API key handling

## Prerequisites

1. **Groq Account**: Sign up at https://console.groq.com (FREE)
2. **Pinecone Account**: Sign up at https://www.pinecone.io (FREE tier available)
3. **HuggingFace Account** (OPTIONAL): For higher rate limits at https://huggingface.co

## Setup Steps

### 1. Create Pinecone Index

1. Go to Pinecone dashboard
2. Create a new index with:
   - **Name**: `cleanflowai-docs` (or your preferred name)
   - **Dimensions**: `384` (required for all-MiniLM-L6-v2 model)
   - **Metric**: `cosine`
   - **Cloud**: Choose your preferred cloud provider

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Groq API Key (for Llama 3.1 chat completions) - REQUIRED
GROQ_API_KEY=gsk_your_groq_api_key_here

# HuggingFace API Key (OPTIONAL - for higher rate limits on embeddings)
# Get free key at: https://huggingface.co/settings/tokens
# Leave empty for basic free usage
HUGGINGFACE_API_KEY=

# Pinecone Configuration - REQUIRED
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=cleanflowai-docs
```

### 3. Seed Documentation

Upload the documentation to Pinecone:

**Option A: Using the Chat Drawer**
1. Start the development server: `npm run dev`
2. Click "Help & Support" in the sidebar
3. Click the upload icon in the chat header
4. Upload `docs/application-flow.md`

**Option B: Using cURL**
```bash
curl -X POST http://localhost:3000/api/chat/embed \
  -F "file=@docs/application-flow.md" \
  -F "source=application-flow"
```

**Option C: Using the API programmatically**
```javascript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('source', 'my-document');

const response = await fetch('/api/chat/embed', {
  method: 'POST',
  body: formData,
});
```

## Usage

### Opening the Chat

1. **From Sidebar**: Click "Help & Support" in the navigation sidebar
2. **Floating Button**: Use the `ChatButton` component on any page

### Features

- **Natural Language Q&A**: Ask questions about CleanFlowAI features
- **Document Upload**: Add more documentation to improve responses
- **Conversation History**: Chat history is saved locally
- **Source Attribution**: See which documentation sections were used
- **Markdown Support**: Responses are formatted with markdown

### Example Questions

- "How do I upload a file?"
- "What does the DQ score mean?"
- "How do I connect QuickBooks?"
- "What file formats are supported?"
- "How do I push data to an ERP?"

## API Endpoints

### POST /api/chat
Send a chat message and get a response.

**Request:**
```json
{
  "message": "How do I upload a file?",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "reply": "To upload a file...",
  "sources": [
    { "score": 0.85, "section": "File Upload Section" }
  ]
}
```

### POST /api/chat/embed
Upload a document to be embedded and stored.

**Request:** FormData with:
- `file`: The document file (.txt, .md, .json)
- `source`: A name for the document

**Response:**
```json
{
  "success": true,
  "chunksProcessed": 42,
  "message": "Successfully processed and indexed 42 chunks"
}
```

### GET /api/chat/embed
Get index statistics.

**Response:**
```json
{
  "indexName": "cleanflowai-docs",
  "totalVectors": 150,
  "dimensions": 384
}
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chat Drawer   │────>│  /api/chat      │────>│     Groq        │
│   (Frontend)    │     │  (API Route)    │     │  (Llama 3.1)    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 │ Query
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │    Pinecone     │<────│  HuggingFace    │
                        │  (Vector DB)    │     │  (Embeddings)   │
                        └─────────────────┘     └─────────────────┘
```

## Troubleshooting

### "Failed to process chat message"
- Check that all API keys are correctly set in `.env.local`
- Verify Pinecone index exists and has the correct dimensions (**384**)
- Check browser console and server logs for detailed errors

### "No specific documentation found"
- Upload documentation using the chat drawer upload feature
- Verify the document was processed successfully
- Check Pinecone dashboard to see vector count

### Slow Responses
- Groq (Llama 3.1) responses are typically fast
- If slow, check your internet connection
- Consider reducing `topK` in the query for faster results

## Cost Considerations

- **Groq**: FREE tier available, paid plans for higher volume
- **HuggingFace Embeddings**: FREE (no API key needed for basic usage)
- **Pinecone**: FREE tier includes 1 index with 100K vectors

**This setup is completely FREE to use!**

## Security Notes

- API keys are stored server-side only (in `.env.local`)
- All API calls go through Next.js API routes
- No sensitive data is exposed to the client
- Chat history is stored in localStorage (client-side only)
