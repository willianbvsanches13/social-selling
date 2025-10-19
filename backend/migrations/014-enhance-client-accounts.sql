-- Migration: Enhance Client Accounts Table for IG-002
-- Description: Adds missing fields required for Instagram Account Management (IG-002)
-- Dependencies: 003-create-client-accounts.sql

-- Add missing columns
ALTER TABLE client_accounts
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS biography TEXT,
  ADD COLUMN IF NOT EXISTS website VARCHAR(500),
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Update the status constraint to match IG-002 spec
ALTER TABLE client_accounts
  DROP CONSTRAINT IF EXISTS chk_client_accounts_status;

ALTER TABLE client_accounts
  ADD CONSTRAINT chk_client_accounts_status
    CHECK (status IN ('active', 'token_expired', 'token_revoked', 'disconnected', 'rate_limited', 'error'));

-- Add constraint for account_type
ALTER TABLE client_accounts
  ADD CONSTRAINT chk_client_accounts_account_type
    CHECK (account_type IN ('personal', 'business', 'creator'));

-- Create index for token_expires_at for efficient querying of expiring tokens
CREATE INDEX IF NOT EXISTS idx_client_accounts_token_expires
  ON client_accounts(token_expires_at)
  WHERE token_expires_at IS NOT NULL AND status = 'active';

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_client_accounts_token_expires;
-- ALTER TABLE client_accounts DROP CONSTRAINT IF EXISTS chk_client_accounts_account_type;
-- ALTER TABLE client_accounts DROP COLUMN IF EXISTS display_name;
-- ALTER TABLE client_accounts DROP COLUMN IF EXISTS biography;
-- ALTER TABLE client_accounts DROP COLUMN IF EXISTS website;
-- ALTER TABLE client_accounts DROP COLUMN IF EXISTS account_type;
-- ALTER TABLE client_accounts DROP COLUMN IF EXISTS permissions;
-- ALTER TABLE client_accounts DROP COLUMN IF NOT EXISTS token_expires_at;
