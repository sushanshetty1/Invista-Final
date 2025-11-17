-- Prisma migration: add pgvector extension and rag_documents table
-- Generated: 2025-11-14
-- NOTE: This file is a SQL migration compatible with prisma migrate when using
-- a raw SQL migration approach. Review before applying.

BEGIN;

-- Enable pgvector extension (requires DB role privileges)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for RAG documents
CREATE TABLE IF NOT EXISTS rag_documents (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  tenant_id TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: IVFFLAT index for approximate nearest neighbor search.
-- Tune `lists` for your dataset size. Uncomment to create the index when ready.
-- CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding_ivf
--   ON rag_documents USING ivfflat (embedding vector_l2_ops)
--   WITH (lists = 100);

COMMIT;

-- Helpful notes:
-- 1) If you use Prisma migrations, add this migration folder to version control and run:
--    npx prisma migrate deploy --schema=prisma/schema-neon.prisma
-- 2) If the extension creation is not permitted on your Neon plan, run the CREATE EXTENSION
--    step in the Neon SQL console (or use a DB admin) and then run the rest of the migration.
