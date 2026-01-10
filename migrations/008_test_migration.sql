-- Migration: Test migration with up/down support
-- Description: Test migration to verify rollback functionality

-- up
CREATE TABLE IF NOT EXISTS test_migration_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- down
DROP TABLE IF EXISTS test_migration_table;
