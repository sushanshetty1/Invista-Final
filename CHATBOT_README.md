# Invista AI Chatbot System

## Architecture Overview

The Invista chatbot separates information into **three distinct pipelines** to respond accurately without hallucinating or mixing live operational data with static company knowledge:

1. **RAG (Knowledge Base)** - Static/slow-changing knowledge (SOPs, policies, manuals)
2. **Live API Queries** - Real-time operational data (inventory, orders, shipments)
3. **Navigation Map** - Page routing and UI navigation

## How It Works

### Message Processing Flow

```
User Message
    ↓
Intent Classifier (OpenAI)
    ↓
    ├─→ knowledge.explainer → RAG System → pgvector → LLM Response
    ├─→ inventory.lookup → Backend API → Structured Data → Formatted Response
    ├─→ orders.status → Backend API → Structured Data → Formatted Response
    ├─→ navigation.page → Navigation Map → URL → Navigation Action
    └─→ fallback → Generic Help Response
```

### Intent Types

- **knowledge.explainer** - How things work, SOPs, policies, workflows
- **inventory.lookup** - Specific product/inventory information
- **inventory.lowstock** - Low stock alerts and items
- **orders.status** - Order status and details
- **orders.recent** - Recent orders summary
- **shipments.today** - Today's shipments
- **shipments.pending** - Pending shipments
- **suppliers.list** - Supplier information
- **navigation.page** - Navigate to specific pages
- **fallback** - General help and greetings

## Components

### 1. Intent Classifier
**File:** `app/api/chat/classify/route.ts`

Uses OpenAI to classify user messages into specific intents. Returns structured JSON with intent type, confidence score, and extracted parameters.

### 2. Navigation Map
**File:** `lib/navigation-map.ts`

Static mapping of page names to URLs. No database queries needed - direct URL lookup.

```typescript
{
  "inventory": { url: "/inventory", description: "..." },
  "dashboard": { url: "/dashboard", description: "..." }
}
```

### 3. Backend Query Handlers
**File:** `lib/chat-query-handlers.ts`

Handles live data queries by calling internal API endpoints. The chatbot never writes SQL - the backend handles all database logic and returns structured data.

**Key Principle:** The chatbot calls stable API interfaces. The backend translates requests into SQL queries.

### 4. RAG System
**Files:** 
- `lib/rag-ingest-storage.ts` - Ingestion from Supabase Storage
- `app/api/chat/route.ts` - RAG query handling
- Prisma schema includes `RagDocument` model

#### What Goes in RAG:
- ✅ SOPs (Standard Operating Procedures)
- ✅ Process manuals and workflows
- ✅ Company policies and guidelines
- ✅ FAQs and documentation
- ✅ Role definitions and permissions
- ✅ Navigation explanations
- ✅ Internal terminology

#### What DOESN'T Go in RAG:
- ❌ Real-time inventory counts
- ❌ Current order statuses
- ❌ Live stock levels
- ❌ Today's shipments
- ❌ Operational metrics

### 5. Main Chat API
**File:** `app/api/chat/route.ts`

Orchestrates the entire pipeline:
1. Classifies intent
2. Routes to appropriate handler (RAG/API/Navigation)
3. Generates LLM response with context
4. Streams or returns JSON response

### 6. Chatbot UI Component
**File:** `components/InvistaChatbot.tsx`

React component with:
- Message history with conversation context
- Intent badges showing query type
- Source citations for RAG responses
- Navigation actions with automatic routing
- Streaming support for knowledge queries
- Formatted display for live data

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
NEON_DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Optional (with defaults)
RAG_CHUNK_MAX_CHARS="1000"
RAG_DEFAULT_TOP_K="3"
CHATBOT_INTENT_MODEL="gpt-4o-mini"
```

### 2. Database Setup

The `rag_documents` table is defined in `prisma/schema-neon.prisma`:

```prisma
model RagDocument {
  id         BigInt   @id @default(autoincrement())
  source     String
  chunkIndex Int      @map("chunk_index")
  content    String
  embedding  Unsupported("vector(1536)")?
  tenantId   String?  @map("tenant_id")
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("rag_documents")
  @@index([tenantId])
}
```

Run migrations:
```bash
npm run db:migrate:neon
```

### 3. Supabase Storage Setup

Create a storage bucket for company documents:

1. In Supabase dashboard, go to Storage
2. Create bucket: `company-documents`
3. Set appropriate access policies
4. Upload documents in folder structure: `{companyId}/category/file.md`

Recommended folder structure:
```
company-documents/
  {companyId}/
    sops/
      - purchase-order-process.md
      - audit-workflow.md
    policies/
      - inventory-management.md
      - returns-policy.md
    manuals/
      - user-guide.md
      - admin-guide.md
    faqs/
      - general-faq.md
```

### 4. Document Ingestion

Ingest documents from Supabase Storage:

```typescript
// API call
POST /api/rag/ingest-storage
{
  "companyId": "your-company-id",
  "bucketName": "company-documents",
  "folderPath": "sops",
  "metadata": {
    "category": "SOP",
    "version": "1.0",
    "roleAccess": ["admin", "manager"]
  },
  "refresh": true  // Delete existing and re-ingest
}
```

Or use the script:
```bash
# TODO: Add CLI script for ingestion
```

### 5. Using the Chatbot

Import and use the component:

```tsx
import InvistaChatbot from "@/components/InvistaChatbot";

export default function ChatPage() {
  return <InvistaChatbot />;
}
```

## Example Queries

### Knowledge Queries (RAG)
- "How do I create a purchase order?"
- "Explain the audit workflow"
- "What is the returns policy?"
- "How do I add a new supplier?"

### Live Data Queries (API)
- "Show me low stock items"
- "What's the status of order #123?"
- "List recent orders"
- "Do we have red widgets in stock?"

### Navigation Queries
- "Open inventory page"
- "Go to dashboard"
- "Take me to reports"
- "Show purchase orders"

## Key Design Principles

### 1. Separation of Concerns
**RAG** stores HOW the company works (processes, policies)  
**Backend APIs** provide WHAT is happening right now (live data)  
**Navigation Map** tells WHERE things are located (URLs)

### 2. No SQL in Chatbot
The chatbot never constructs SQL queries. It calls structured API endpoints that return JSON. The backend owns all database logic.

### 3. Auto-Update Strategy
- **RAG**: Updates when documents change in Supabase Storage (webhook/trigger)
- **Live Data**: Always current (direct database queries)
- **Navigation**: Manual updates or lightweight CMS

### 4. Role-Based Access
Documents in RAG can have `roleAccess` metadata to restrict visibility based on user roles.

### 5. Versioning
Documents include version metadata for tracking changes and rolling back if needed.

## API Endpoints

### Chat
- `POST /api/chat` - Main chat endpoint
- `POST /api/chat/classify` - Intent classification

### RAG Management
- `POST /api/rag` - Legacy RAG query (still works)
- `POST /api/rag/ingest` - Legacy company data ingest
- `POST /api/rag/ingest-storage` - Ingest from Supabase Storage

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RAG_CHUNK_MAX_CHARS` | `1000` | Max characters per chunk |
| `RAG_DEFAULT_TOP_K` | `3` | Number of RAG results |
| `RAG_LLM_TEMPERATURE` | `0` | LLM temperature (0-1) |
| `RAG_LLM_STREAMING` | `true` | Enable streaming |
| `RAG_PROMPT_TEMPLATE` | (default) | RAG system prompt |
| `CHATBOT_INTENT_MODEL` | `gpt-4o-mini` | Intent classifier model |
| `CHATBOT_MAX_HISTORY` | `10` | Max history messages |

## Troubleshooting

### Intent Misclassification
If the chatbot misroutes queries, check the intent classifier prompt in `app/api/chat/classify/route.ts`. Add more examples for edge cases.

### No RAG Results
1. Ensure documents are ingested: `POST /api/rag/ingest-storage`
2. Check pgvector setup: `SELECT COUNT(*) FROM rag_documents WHERE tenant_id = 'your-company-id'`
3. Verify embeddings are not null

### Live Data Not Found
1. Confirm API endpoints are working: test `/api/inventory/products` directly
2. Check company ID is correct
3. Verify backend query handlers in `lib/chat-query-handlers.ts`

### Navigation Not Working
1. Check navigation map in `lib/navigation-map.ts`
2. Ensure page names match user queries (case-insensitive)
3. Verify router is working in the component

## Future Enhancements

- [ ] PDF and DOCX support in document extraction
- [ ] Webhook triggers for auto-ingestion on Storage changes
- [ ] Admin UI for document management
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Advanced analytics on query patterns
- [ ] Fine-tuned intent classifier
- [ ] Suggested follow-up questions

## Security Notes

- Never commit real API keys (use `.env`, not `.env.example`)
- Use `SUPABASE_SERVICE_ROLE_KEY` only server-side
- Implement proper authentication checks in API routes
- Validate `companyId` against user's access permissions
- Sanitize user input before embedding/querying

## Performance Optimization

- Cache frequently accessed documents
- Use IVFFLAT index for large RAG datasets (>10k vectors)
- Implement request rate limiting
- Consider Redis for intent classification cache
- Batch document ingestion for large uploads

---

**Built with:** Next.js, OpenAI, Supabase, Neon PostgreSQL, pgvector, LangChain.js, Prisma
