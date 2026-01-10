-- Migration: Create dismissed_recommendations table
-- Description: Creates a table to track content that users have dismissed from recommendations

-- Step 1: Create dismissed_recommendations table
CREATE TABLE IF NOT EXISTS dismissed_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_id)
);

-- Step 2: Create index on user_id for efficient querying of user's dismissed content
CREATE INDEX IF NOT EXISTS idx_dismissed_recommendations_user_id ON dismissed_recommendations(user_id);

-- Step 3: Create index on content_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_dismissed_recommendations_content_id ON dismissed_recommendations(content_id);
