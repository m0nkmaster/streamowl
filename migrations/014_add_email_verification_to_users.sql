-- Migration: Add email verification to users table
-- Purpose: Add email_verified_at column to track email verification status

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for queries that filter by verification status
CREATE INDEX IF NOT EXISTS idx_users_email_verified_at ON users(email_verified_at);

COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when the email address was verified. NULL means unverified.';

-- down
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
DROP INDEX IF EXISTS idx_users_email_verified_at;
