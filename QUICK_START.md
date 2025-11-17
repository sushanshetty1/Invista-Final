# Invista Chatbot - Quick Start Guide

Get the chatbot running in 5 minutes! ⚡

## Prerequisites

- Node.js 18+ installed
- OpenAI API key
- Neon PostgreSQL database with pgvector
- Supabase account (for auth & storage)
- Invista project already set up

## Step 1: Environment Setup (2 min)

```bash
# Copy environment template
cp .env.example .env

# Edit .env and fill in these required values:
# NEON_DATABASE_URL="postgresql://..."
# OPENAI_API_KEY="sk-..."
# NEXT_PUBLIC_SUPABASE_URL="https://..."
# NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
# SUPABASE_SERVICE_ROLE_KEY="..."
# RAG_DEFAULT_COMPANY_ID="your-company-id"
```

Or run the setup helper:
```bash
node scripts/chatbot-setup.js
```

## Step 2: Database Migration (1 min)

The `rag_documents` table is already defined in `prisma/schema-neon.prisma`.

```bash
# Run migrations
npm run db:migrate:neon

# Verify table exists
# In your Neon console, check for 'rag_documents' table
```

## Step 3: Upload Documents (Optional, 1 min)

If you want to test RAG (knowledge queries):

1. Go to your Supabase dashboard → Storage
2. Create bucket: `company-documents` (if not exists)
3. Upload a test document:
   ```
   company-documents/
     {your-company-id}/
       test-doc.md  ← Upload a markdown file here
   ```

Example test document (`test-doc.md`):
```markdown
# Purchase Order Process

To create a purchase order:
1. Navigate to Purchase Orders page
2. Click "New Purchase Order"
3. Select supplier
4. Add line items
5. Review and submit

The system will automatically generate a PO number.
```

## Step 4: Ingest Documents (Optional, 1 min)

```bash
# Start your dev server first
npm run dev

# In another terminal, ingest documents
curl -X POST http://localhost:3000/api/rag/ingest-storage \
  -H "Content-Type: application/json" \
  -d '{"companyId": "your-company-id", "refresh": true}'
```

Or skip this step - the chatbot works without RAG for live data queries!

## Step 5: Test the Chatbot! (30 sec)

```bash
# Make sure dev server is running
npm run dev

# Open browser
open http://localhost:3000/rag
```

Try these queries:

### Without RAG (works immediately):
- "Show me low stock items"
- "What are recent orders?"
- "Go to dashboard"
- "Open inventory page"

### With RAG (requires documents):
- "How do I create a purchase order?"
- "Explain the audit process"
- "What is the returns policy?"

## Troubleshooting

### Chatbot not responding?
```bash
# Check if server is running
curl http://localhost:3000/api/health

# Check if OpenAI key is valid
curl http://localhost:3000/api/chat/classify \
  -X POST -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

### No RAG results?
```bash
# Check if documents are ingested
# In your Neon console:
SELECT COUNT(*) FROM rag_documents WHERE tenant_id = 'your-company-id';

# Should return > 0 if documents are ingested
```

### Intent classification wrong?
The classifier learns from examples. Edit the prompt in:
`app/api/chat/classify/route.ts`

### Navigation not working?
Check the page exists in:
`lib/navigation-map.ts`

## What's Next?

### Production Checklist:
- [ ] Add authentication to API routes
- [ ] Validate companyId against user permissions
- [ ] Set up rate limiting
- [ ] Configure IVFFLAT index for large datasets
- [ ] Set up Supabase Storage webhooks for auto-ingestion
- [ ] Monitor OpenAI API usage and costs
- [ ] Add error tracking (Sentry, etc.)

### Enhance the System:
- [ ] Upload more documents for better RAG responses
- [ ] Customize intent classification examples
- [ ] Add more navigation routes
- [ ] Implement shipments and suppliers APIs
- [ ] Add conversation export/history
- [ ] Build admin UI for document management

## Architecture

See detailed architecture documentation:
- `CHATBOT_README.md` - Complete guide
- `CHATBOT_ARCHITECTURE.md` - Visual diagrams
- `IMPLEMENTATION_SUMMARY.md` - What was built

## Testing

```bash
# Run automated tests (when server is running)
node scripts/test-chatbot.js
```

## Support

- Check logs in terminal for errors
- Review `CHATBOT_README.md` for detailed troubleshooting
- Ensure all environment variables are set correctly

---

**You're all set!** 🎉

The chatbot will:
- ✅ Answer questions about processes (if documents uploaded)
- ✅ Query live inventory and order data
- ✅ Navigate to any page in the app
- ✅ Provide helpful responses with sources and context

Enjoy your AI assistant! 🤖
