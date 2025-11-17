# RAG Prototype (Neon + pgvector + OpenAI + LangChain.js)

This folder contains a minimal prototype to add a Retrieval-Augmented Generation (RAG) layer using your existing Neon Postgres + pgvector setup, OpenAI for embeddings and generations, and LangChain.js for prompt orchestration.

Files added by the prototype:
- `scripts/rag-ingest.ts` — small ingestion script to embed local files (README.md, CODEBASE_STATUS.md) and store vectors in `rag_documents` table.
- `app/api/rag/route.ts` — a Next.js API route that accepts POST { query, topK } and returns an LLM answer plus the matching source chunks.

Before you run anything
1. Install the required packages:

```powershell
npm install openai pg langchain
npm install -D tsx dotenv
```

2. Ensure pgvector is enabled on your Neon Postgres instance:

```sql
-- connect to your database
CREATE EXTENSION IF NOT EXISTS vector;

-- recommended table schema (the ingestion script will also create it):
CREATE TABLE IF NOT EXISTS rag_documents (
  id SERIAL PRIMARY KEY,
  source TEXT,
  chunk_index INT,
  content TEXT,
  embedding VECTOR(1536), -- set this to your embedding dim
  created_at TIMESTAMPTZ DEFAULT now()
);
```

3. Set environment variables (e.g., in `.env`):

```
NEON_DATABASE_URL="postgres://user:pass@host:5432/dbname"
OPENAI_API_KEY="sk-..."
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIM=1536
```

Running the ingestion

```powershell
npx tsx scripts/rag-ingest.ts
```

This will read `README.md` and `CODEBASE_STATUS.md`, chunk them, call OpenAI embeddings, and insert them into `rag_documents`.

Using the API route

POST to `/api/rag` with JSON body:

```json
{ "query": "How do I run the project locally?", "topK": 5 }
```

Response format:

```json
{
  "answer": "...",
  "sources": [ { "id": 1, "source": "README.md", "chunk_index": 0, "content": "..." }, ... ]
}
```

Notes & next steps
- The prototype uses a naive chunker. For production, replace with a token-aware chunker (tiktoken or tokenizer) and overlap.
- Validate the embedding dimension matches the model you use.
- Add auth, rate-limiting, streaming responses, and caching for production.
- Consider adding a content hash to avoid re-embedding unchanged files.

Security
- Do not commit your `.env` with secrets. Keep API keys and DB credentials in your deployment secrets.

If you'd like, I can:
- generate a small TypeScript LangChain pipeline that uses an official LangChain `Retriever` abstraction,
- or modify this prototype to use Supabase Vector or Qdrant instead of pgvector.
