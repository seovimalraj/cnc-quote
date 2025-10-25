-- Migration: Add pgvector extension and embeddings table
-- Date: 2025-10-25
-- Purpose: Store document embeddings for semantic search (BGE-M3 model produces 1024-dim vectors)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Document metadata
  doc_type TEXT NOT NULL, -- e.g., 'material', 'finish', 'tolerance', 'shop_capability'
  doc_id TEXT, -- reference ID (e.g., material code, finish name)
  doc_title TEXT NOT NULL,
  doc_content TEXT NOT NULL,
  doc_url TEXT,
  
  -- Chunking info
  chunk_index INTEGER DEFAULT 0,
  chunk_total INTEGER DEFAULT 1,
  
  -- Embedding vector (BGE-M3 = 1024 dimensions)
  embedding vector(1024) NOT NULL,
  
  -- Metadata
  model_name TEXT DEFAULT 'bge-m3',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Tenant isolation (if multi-tenant)
  org_id UUID,
  
  -- Indexing
  CONSTRAINT unique_doc_chunk UNIQUE (doc_type, doc_id, chunk_index)
);

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_hnsw 
ON document_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create GIN index for metadata filtering
CREATE INDEX IF NOT EXISTS idx_embeddings_doc_type ON document_embeddings(doc_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_org_id ON document_embeddings(org_id) WHERE org_id IS NOT NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_embeddings_updated_at
BEFORE UPDATE ON document_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_embeddings_updated_at();

-- Add RLS policies (optional, enable if needed)
-- ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY embeddings_org_isolation ON document_embeddings
--   FOR ALL USING (org_id = current_setting('app.current_org_id', TRUE)::UUID);

COMMENT ON TABLE document_embeddings IS 'Stores document embeddings for semantic search using pgvector';
COMMENT ON COLUMN document_embeddings.embedding IS 'Vector embedding (1024-dim for BGE-M3 model)';
COMMENT ON INDEX idx_embeddings_vector_hnsw IS 'HNSW index for fast cosine similarity search';
