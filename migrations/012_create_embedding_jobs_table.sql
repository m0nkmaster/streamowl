-- Migration: Create embedding jobs queue table
-- Description: Creates a job queue table for background embedding generation with status tracking and retry support

-- Step 1: Create embedding_jobs table
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Step 2: Create index on status for efficient querying of pending jobs
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON embedding_jobs(status) WHERE status IN ('pending', 'processing');

-- Step 3: Create index on content_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_content_id ON embedding_jobs(content_id);

-- Step 4: Create unique constraint to prevent duplicate jobs for same content
CREATE UNIQUE INDEX IF NOT EXISTS idx_embedding_jobs_content_unique ON embedding_jobs(content_id) WHERE status IN ('pending', 'processing');
