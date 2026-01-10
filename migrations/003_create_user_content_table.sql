-- Migration: Create user_content junction table
-- Description: Creates user_content table for tracking watched/to_watch/favourite status with ratings and notes

-- Create enum type for user_content status
CREATE TYPE user_content_status AS ENUM ('watched', 'to_watch', 'favourite');

-- Create user_content junction table
CREATE TABLE IF NOT EXISTS user_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  status user_content_status NOT NULL,
  rating NUMERIC(3, 1) CHECK (rating >= 0 AND rating <= 10),
  notes TEXT,
  watched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_content_user_id ON user_content(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_content_id ON user_content(content_id);
CREATE INDEX IF NOT EXISTS idx_user_content_status ON user_content(status);
CREATE INDEX IF NOT EXISTS idx_user_content_watched_at ON user_content(watched_at);

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_user_content_updated_at
  BEFORE UPDATE ON user_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
