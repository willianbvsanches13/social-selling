-- Migration: Create OAuth Tokens Table
-- Description: Creates oauth_tokens table for storing encrypted OAuth tokens
-- Dependencies: 001-initial-schema.sql (users), 003-create-client-accounts.sql

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  access_token TEXT NOT NULL, -- Encrypted with pgcrypto
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT chk_oauth_tokens_platform
    CHECK (platform IN ('instagram', 'whatsapp'))
);

-- Create indexes for performance
CREATE UNIQUE INDEX idx_oauth_tokens_client_account
  ON oauth_tokens(client_account_id)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_expires_at
  ON oauth_tokens(expires_at)
  WHERE revoked_at IS NULL;

-- Apply updated_at trigger
CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_oauth_tokens_updated_at ON oauth_tokens;
-- DROP TABLE IF EXISTS oauth_tokens CASCADE;
