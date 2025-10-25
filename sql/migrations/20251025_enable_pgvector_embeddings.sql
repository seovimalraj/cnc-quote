-- Enable pgvector extension for storing embeddings
-- Run this migration after installing pgvector: https://github.com/pgvector/pgvector

CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for storing document chunks and their vector representations
CREATE TABLE IF NOT EXISTS public.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL, -- e.g., 'material', 'finish', 'tolerance', 'capability'
  doc_id TEXT, -- optional reference ID (e.g., material slug, finish ID)
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  embedding VECTOR(1024), -- BGE-M3 produces 1024-dimensional embeddings
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search (using HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON public.embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Create index for filtering by doc_type
CREATE INDEX IF NOT EXISTS embeddings_doc_type_idx ON public.embeddings(doc_type);

-- Create index for filtering by doc_id
CREATE INDEX IF NOT EXISTS embeddings_doc_id_idx ON public.embeddings(doc_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_embeddings_timestamp
  BEFORE UPDATE ON public.embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embeddings_updated_at();

-- Grant permissions (adjust role as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.embeddings TO service_role;

COMMENT ON TABLE public.embeddings IS 'Stores document chunks and their vector embeddings for semantic search';
COMMENT ON COLUMN public.embeddings.embedding IS 'Vector embedding from BGE-M3 model (1024 dimensions)';
COMMENT ON COLUMN public.embeddings.doc_type IS 'Type of document: material, finish, tolerance, capability, etc.';
COMMENT ON COLUMN public.embeddings.metadata IS 'Additional metadata as JSON (e.g., source file, tags, etc.)';
