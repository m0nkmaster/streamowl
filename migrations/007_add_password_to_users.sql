-- Migration: Add password column to users table
-- Description: Adds password_hash column for storing bcrypt hashed passwords

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index on email for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
