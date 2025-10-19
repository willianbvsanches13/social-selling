-- Migration: Create Refresh Tokens Table
-- Description: Creates refresh_tokens table for JWT refresh token management
-- Dependencies: 001-initial-schema.sql (users table)

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE UNIQUE INDEX idx_refresh_tokens_token_hash
  ON refresh_tokens(token_hash)
  WHERE revoked_at IS NULL;

-- ROLLBACK
-- DROP TABLE IF EXISTS refresh_tokens CASCADE;
