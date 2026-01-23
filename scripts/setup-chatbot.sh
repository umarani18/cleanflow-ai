#!/bin/bash

# ERP Transform App - Chatbot Quick Setup Script

echo "🚀 ERP Transform Chatbot Setup"
echo "================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo ""
    echo "Please create .env.local with:"
    echo "  GROQ_API_KEY=your_groq_key"
    echo "  PINECONE_API_KEY=your_pinecone_key"
    echo "  PINECONE_INDEX_NAME=cleanflowai-docs"
    exit 1
fi

# Check environment variables
if ! grep -q "GROQ_API_KEY" .env.local; then
    echo "❌ GROQ_API_KEY missing from .env.local"
    exit 1
fi

if ! grep -q "PINECONE_API_KEY" .env.local; then
    echo "❌ PINECONE_API_KEY missing from .env.local"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""
echo "📚 Next steps:"
echo "1. Start the dev server: npm run dev"
echo "2. The chatbot will auto-seed documentation on first run"
echo "3. Visit http://localhost:3000 and click 'Help & Support'"
echo ""
echo "🔗 Useful endpoints:"
echo "  POST /api/chat - Send chat messages"
echo "  POST /api/chat/seed - Manually seed documentation"
echo "  GET  /api/chat/embed - Get index statistics"
