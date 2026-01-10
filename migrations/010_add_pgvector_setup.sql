-- Migration: Add pgvector extension and embedding columns
-- Description: Enables pgvector extension and adds embedding columns to users and content tables for vector similarity search

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add taste_embedding column to users table
-- Using 1536 dimensions for OpenAI text-embedding-3-small model
ALTER TABLE users ADD COLUMN IF NOT EXISTS taste_embedding vector(1536);

-- Step 3: Add content_embedding column to content table
-- Using 1536 dimensions for OpenAI text-embedding-3-small model
ALTER TABLE content ADD COLUMN IF NOT EXISTS content_embedding vector(1536);

-- Step 4: Create vector similarity index for efficient queries
-- Using cosine distance (1 - cosine similarity) for embedding similarity search
-- HNSW index provides fast approximate nearest neighbour search
CREATE INDEX IF NOT EXISTS idx_users_taste_embedding_cosine 
  ON users 
  USING hnsw (taste_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_content_content_embedding_cosine 
  ON content 
  USING hnsw (content_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
