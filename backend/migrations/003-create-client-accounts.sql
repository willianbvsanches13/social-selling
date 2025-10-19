-- Migration: Create Client Accounts Table
-- Description: Creates client_accounts table for managing connected Instagram/WhatsApp accounts
-- Dependencies: 001-initial-schema.sql (users table)

CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_account_id TEXT NOT NULL,
  username TEXT NOT NULL,
  profile_picture_url TEXT,
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  media_count INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_client_accounts_platform
    CHECK (platform IN ('instagram', 'whatsapp')),
  CONSTRAINT chk_client_accounts_status
    CHECK (status IN ('active', 'token_expired', 'token_revoked', 'disconnected', 'error'))
);

-- Create indexes for performance
CREATE UNIQUE INDEX idx_client_accounts_platform_account
  ON client_accounts(platform, platform_account_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_client_accounts_user_id ON client_accounts(user_id);
CREATE INDEX idx_client_accounts_status ON client_accounts(status);
CREATE INDEX idx_client_accounts_last_sync ON client_accounts(last_sync_at);

-- Apply updated_at trigger
CREATE TRIGGER update_client_accounts_updated_at
  BEFORE UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_client_accounts_updated_at ON client_accounts;
-- DROP TABLE IF EXISTS client_accounts CASCADE;
