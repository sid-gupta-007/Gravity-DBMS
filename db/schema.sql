-- ============================================
-- Gravity-DBMS: Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the documents table
CREATE TABLE IF NOT EXISTS documents (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'General',
    metadata    JSONB DEFAULT '{}',
    embedding   vector(384),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents 
USING hnsw (embedding vector_cosine_ops);

-- 4. RPC function for semantic search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(384),
    match_count INT DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    content TEXT,
    category TEXT,
    metadata JSONB,
    similarity FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.title,
        d.content,
        d.category,
        d.metadata,
        (1 - (d.embedding <=> query_embedding))::FLOAT AS similarity,
        d.created_at
    FROM documents d
    WHERE d.embedding IS NOT NULL
      AND (1 - (d.embedding <=> query_embedding)) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 6. Allow public read access
CREATE POLICY "Allow public read" ON documents
    FOR SELECT USING (true);

-- 7. Allow public insert
CREATE POLICY "Allow public insert" ON documents
    FOR INSERT WITH CHECK (true);

-- 8. Allow public delete
CREATE POLICY "Allow public delete" ON documents
    FOR DELETE USING (true);

-- 9. Allow public update
CREATE POLICY "Allow public update" ON documents
    FOR UPDATE USING (true);
