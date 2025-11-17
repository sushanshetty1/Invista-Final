# Invista Chatbot System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER SENDS MESSAGE                                   │
│                    "Show me low stock items"                                 │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: INTENT CLASSIFICATION                             │
│                   /api/chat/classify (OpenAI)                                │
│                                                                               │
│  Analyzes message and returns:                                               │
│  {                                                                            │
│    "intent": "inventory.lowstock",                                           │
│    "confidence": 0.95,                                                       │
│    "parameters": {}                                                          │
│  }                                                                            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       STEP 2: ROUTE BY INTENT                                │
│                        /api/chat (Main Hub)                                  │
│                                                                               │
│  ┌─────────────────┬──────────────────┬──────────────────┐                  │
│  │                 │                  │                  │                  │
│  │  knowledge.*    │   inventory.*    │  navigation.*    │                  │
│  │   orders.*      │   shipments.*    │                  │                  │
│  │                 │   suppliers.*    │                  │                  │
│  │                 │                  │                  │                  │
│  ▼                 ▼                  ▼                  │                  │
│                                                                               │
└─┬──────────────────┬──────────────────┬────────────────────────────────────┘
  │                  │                  │
  │                  │                  │
  ▼                  ▼                  ▼

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   PIPELINE   │  │   PIPELINE   │  │   PIPELINE   │
│      1       │  │      2       │  │      3       │
│              │  │              │  │              │
│     RAG      │  │   LIVE API   │  │  NAVIGATION  │
│   SYSTEM     │  │   QUERIES    │  │     MAP      │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │                 │                 │
       ▼                 ▼                 ▼

┌──────────────────────────────────────────────────────────┐
│ PIPELINE 1: RAG (Knowledge Base)                         │
│                                                          │
│ 1. Query → Embed with OpenAI                            │
│ 2. pgvector similarity search in rag_documents          │
│    WHERE tenant_id = companyId                          │
│    ORDER BY embedding <-> query_embedding               │
│ 3. Retrieve top-k chunks with metadata                  │
│ 4. Feed to LLM with prompt template                     │
│ 5. Stream response back to user                         │
│                                                          │
│ Sources: Supabase Storage (SOPs, policies, manuals)     │
│ Update: Webhook on document changes                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ PIPELINE 2: LIVE API QUERIES (Operational Data)          │
│                                                          │
│ 1. Extract parameters from intent                       │
│ 2. Call internal API endpoint:                          │
│    - /api/inventory/products?lowStock=true              │
│    - /api/orders?orderNumber=123                        │
│    - /api/purchase-orders?status=pending                │
│ 3. Backend executes SQL queries                         │
│ 4. Returns structured JSON data                         │
│ 5. Format results for user-friendly display             │
│ 6. Return JSON response (non-streaming)                 │
│                                                          │
│ Sources: Direct database queries (Neon/Prisma)          │
│ Update: Always current (live queries)                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ PIPELINE 3: NAVIGATION (Page Routing)                    │
│                                                          │
│ 1. Extract page name from parameters or message         │
│ 2. Lookup in static navigation map                      │
│    navigationMap["inventory"] → "/inventory"            │
│ 3. Return action object with URL                        │
│ 4. Frontend auto-navigates using Next.js router         │
│                                                          │
│ Sources: Static mapping (lib/navigation-map.ts)         │
│ Update: Manual or via CMS                               │
└──────────────────────────────────────────────────────────┘

       │                 │                 │
       │                 │                 │
       └─────────┬───────┴─────────┬───────┘
                 │                 │
                 ▼                 ▼

┌─────────────────────────────────────────────────────────┐
│              STEP 3: GENERATE RESPONSE                   │
│                                                          │
│ • Knowledge queries: Stream LLM response with sources   │
│ • Live data queries: Format and return JSON             │
│ • Navigation: Return action + confirmation message      │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND COMPONENT                      │
│              components/InvistaChatbot.tsx               │
│                                                          │
│ • Display message with intent badge                     │
│ • Show sources (for RAG responses)                      │
│ • Format live data in readable way                      │
│ • Execute navigation actions                            │
│ • Maintain conversation history                         │
└─────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════

KEY PRINCIPLES:

1. SEPARATION: Three pipelines never mix data
   ✓ RAG = HOW things work
   ✓ Live APIs = WHAT is happening now
   ✓ Navigation = WHERE things are

2. NO SQL IN CHATBOT: Backend owns all database logic
   ✓ Chatbot calls stable API interfaces
   ✓ Backend translates to SQL internally

3. ALWAYS CURRENT: Live data never stale
   ✓ RAG updates when documents change
   ✓ Operational data queried in real-time

4. NO HALLUCINATIONS: Clear data boundaries
   ✓ RAG only answers from uploaded docs
   ✓ Live data only from database
   ✓ Navigation only from static map

═══════════════════════════════════════════════════════════

EXAMPLE FLOWS:

1. "How do I create a purchase order?" (knowledge.explainer)
   → Intent Classifier → RAG Pipeline
   → pgvector search → Find SOP chunks
   → LLM generates answer with citations
   → Stream response with sources

2. "Show me low stock items" (inventory.lowstock)
   → Intent Classifier → Live API Pipeline
   → GET /api/inventory/products?lowStock=true
   → Backend queries: SELECT * FROM inventory WHERE quantity < reorder_point
   → Format results → Return JSON

3. "Go to dashboard" (navigation.page)
   → Intent Classifier → Navigation Pipeline
   → Lookup navigationMap["dashboard"]
   → Return { action: { type: "navigate", url: "/dashboard" } }
   → Frontend auto-navigates

═══════════════════════════════════════════════════════════

DATA FLOW:

Documents (Supabase Storage)
    ↓
Ingestion Script (extract → chunk → embed)
    ↓
rag_documents table (pgvector)
    ↓
RAG Queries (similarity search)
    ↓
LLM Response

Database (Neon)
    ↓
API Endpoints (/api/inventory, /api/orders)
    ↓
Chatbot Query Handlers
    ↓
Formatted Response

Navigation Map (static)
    ↓
URL Lookup
    ↓
Navigation Action
    ↓
Next.js Router

═══════════════════════════════════════════════════════════
```
