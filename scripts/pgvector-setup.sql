-- pgvector setup for Invista (Neon/Postgres)
-- Generated: 2025-11-14
-- Review this file before running. Run in Neon SQL editor or psql connected to NEON_DATABASE_URL.

/*
  Notes:
  - Set EMBEDDING_DIM to the dimensionality of your embedding model (commonly 1536).
  - The IVFFLAT index is optional for small datasets; remove or comment it out to use exact KNN.
  - Tune `lists` according to dataset size (more lists -> faster queries but higher memory/index cost).
  - After bulk inserts, run ANALYZE on the table and consider REINDEX / VACUUM as needed.
*/

-- Change this value if your embedding model uses a different size
-- Example: text-embedding-3-small -> 1536, newer models may vary
-- You can edit the next CREATE TABLE line to change VECTOR(1536) accordingly.

BEGIN;

-- 1) Enable pgvector extension (Neon: run in project SQL editor)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Create table for RAG documents
CREATE TABLE IF NOT EXISTS rag_documents (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  tenant_id TEXT NULL, -- optional: include for multi-tenant scoping
  metadata JSONB NULL, -- optional: store additional metadata (path, author, url)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Index on tenant_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_rag_documents_tenant_id ON rag_documents (tenant_id);

-- 4) Optional: IVFFLAT index for approximate nearest neighbor
-- Tune the 'lists' parameter based on dataset size. Example values:
--   small (<10k vectors): lists = 32
--   medium (10k-200k): lists = 100
--   large (200k+): lists = 500
-- Create the index when you have a stable dataset (index build can be expensive)
-- Uncomment to create IVFFLAT index:
-- CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding_ivf
--   ON rag_documents USING ivfflat (embedding vector_l2_ops)
--   WITH (lists = 100);

-- 5) Recommended exact KNN index for small datasets (optional)
-- If you prefer exact KNN without IVFFLAT, you can create a BRIN or GiST index depending on workload.

-- 5) Example helper: Create function to insert with vector literal (optional convenience)
-- (You can also use parameterized queries from Node/Prisma)

COMMIT;

-- After running the above, if you bulk-inserted data run:
-- ANALYZE rag_documents;
-- VACUUM VERBOSE rag_documents;

-- Quick test example (replace the vector values with your real embedding):
-- INSERT INTO rag_documents (source, chunk_index, content, embedding) VALUES
-- ('README.md', 0, 'Sample chunk text', '{0.001,0.002,0.003,...}'::vector);

-- Example KNN query (top-k):
-- SELECT id, source, chunk_index, content
-- FROM rag_documents
-- ORDER BY embedding <-> '{0.001,0.002,0.003,...}'::vector
-- LIMIT 5;

-- Hybrid example: combine full-text and vector (requires to_tsvector)
-- SELECT id, source, chunk_index, content, (embedding <-> $1::vector) AS distance
-- FROM rag_documents
-- WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $2)
-- ORDER BY distance ASC
-- LIMIT 5;
