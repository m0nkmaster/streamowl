-- Migration: Add Google OAuth support to users table
-- Description: Adds google_id column for storing Google OAuth user IDs

ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Make email nullable to support OAuth-only users (though we'll still require it)
-- Actually, let's keep email required but allow it to be set from OAuth
