-- Migration: Create Conversations Table
-- Description: Creates conversations table for managing message threads
-- Dependencies: 003-create-client-accounts.sql

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform_conversation_id TEXT NOT NULL,
  participant_platform_id TEXT NOT NULL, -- Instagram/WhatsApp user ID
  participant_username TEXT,
  participant_profile_pic TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INT DEFAULT 0,
  status TEXT DEFAULT 'open',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_conversations_status
    CHECK (status IN ('open', 'closed', 'archived'))
);

-- Create indexes for performance
CREATE UNIQUE INDEX idx_conversations_platform
  ON conversations(client_account_id, platform_conversation_id);
CREATE INDEX idx_conversations_client_account ON conversations(client_account_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_active
  ON conversations(client_account_id, status, last_message_at DESC)
  WHERE status = 'open';

-- Apply updated_at trigger
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
-- DROP TABLE IF EXISTS conversations CASCADE;
