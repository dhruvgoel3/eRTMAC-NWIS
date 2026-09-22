-- =============================================================================
-- eRTMAC-NWIS — Migration 003: pgvector Setup
-- =============================================================================
-- Run AFTER 001_schema.sql
--
-- This migration enables pgvector for semantic search on document chunks.
-- pgvector allows storing OpenAI text-embedding-3-small (1536-dim) or
-- text-embedding-3-large (3072-dim) vectors and doing ANN similarity search.
--
-- HOW TO CHECK IF YOUR SUPABASE PROJECT HAS PGVECTOR:
--   Dashboard → Database → Extensions → search "vector"
--   If "vector" is listed, enable it, then run this migration.
--
-- IF PGVECTOR IS NOT AVAILABLE: Skip this file. The system will use JSONB
-- embeddings which still work for demo purposes.
-- =============================================================================

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Upgrade document_chunks.embedding from JSONB to VECTOR(1536)
-- This allows ANN search with cosine similarity (OpenAI embeddings)
-- ---------------------------------------------------------------------------

-- Step 1: Add a new vector column
ALTER TABLE document_chunks
    ADD COLUMN IF NOT EXISTS embedding_vec VECTOR(1536);

-- Step 2: (Manual step) After re-seeding with real OpenAI embeddings,
-- copy data: UPDATE document_chunks SET embedding_vec = embedding::VECTOR(1536);

-- Step 3: Create IVFFlat index for approximate nearest-neighbor search
-- (Run AFTER populating embedding_vec — index creation on empty column is harmless)
CREATE INDEX IF NOT EXISTS ix_chunks_embedding_vec
    ON document_chunks
    USING ivfflat (embedding_vec vector_cosine_ops)
    WITH (lists = 50);

-- ---------------------------------------------------------------------------
-- Helper function: search document chunks by vector similarity
-- Usage: SELECT * FROM match_document_chunks('[0.1, 0.2, ...]'::VECTOR, 0.75, 5);
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding     VECTOR(1536),
    similarity_threshold FLOAT    DEFAULT 0.7,
    match_count         INTEGER   DEFAULT 5
)
RETURNS TABLE (
    id                  INTEGER,
    document_id         INTEGER,
    chunk_text          TEXT,
    depth_context       FLOAT,
    formation_context   VARCHAR(100),
    event_type_context  VARCHAR(50),
    similarity          FLOAT
)
LANGUAGE SQL STABLE
AS $$
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_text,
        dc.depth_context,
        dc.formation_context,
        dc.event_type_context,
        1 - (dc.embedding_vec <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE dc.embedding_vec IS NOT NULL
      AND 1 - (dc.embedding_vec <=> query_embedding) >= similarity_threshold
    ORDER BY dc.embedding_vec <=> query_embedding
    LIMIT match_count;
$$;

-- ---------------------------------------------------------------------------
-- Grant execute on match function
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION match_document_chunks TO anon, authenticated, service_role;
