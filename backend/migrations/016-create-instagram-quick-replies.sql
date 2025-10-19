-- Migration: Create Instagram Quick Replies Table
-- Description: Creates quick replies table for automatic message triggering
-- Dependencies: 003-create-client-accounts.sql

CREATE TABLE instagram_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  trigger_keyword VARCHAR(255) NOT NULL,
  response_text TEXT NOT NULL,
  response_media_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  match_type VARCHAR(50) DEFAULT 'exact',
  priority INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_match_type
    CHECK (match_type IN ('exact', 'contains', 'starts_with', 'regex')),
  CONSTRAINT uniq_account_keyword
    UNIQUE (instagram_account_id, trigger_keyword)
);

-- Create indexes for performance
CREATE INDEX idx_quick_replies_account ON instagram_quick_replies(instagram_account_id);
CREATE INDEX idx_quick_replies_active ON instagram_quick_replies(is_active);
CREATE INDEX idx_quick_replies_priority ON instagram_quick_replies(priority DESC);
CREATE INDEX idx_quick_replies_account_active
  ON instagram_quick_replies(instagram_account_id, is_active, priority DESC);

-- Apply updated_at trigger
CREATE TRIGGER update_instagram_quick_replies_updated_at
  BEFORE UPDATE ON instagram_quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_instagram_quick_replies_updated_at ON instagram_quick_replies;
-- DROP TABLE IF EXISTS instagram_quick_replies CASCADE;
