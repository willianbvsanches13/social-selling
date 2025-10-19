-- Migration: Enhance Instagram Conversations Table
-- Description: Adds Instagram-specific fields to conversations table
-- Dependencies: 007-create-conversations.sql

-- Add Instagram-specific columns to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS participant_ig_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS participant_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS participant_is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_message_text TEXT,
ADD COLUMN IF NOT EXISTS last_message_sender VARCHAR(50),
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add constraints for Instagram fields
ALTER TABLE conversations
ADD CONSTRAINT chk_conversations_priority
  CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD CONSTRAINT chk_conversations_last_message_sender
  CHECK (last_message_sender IS NULL OR last_message_sender IN ('user', 'page'));

-- Create additional indexes for Instagram fields
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_unread ON conversations(unread_count) WHERE unread_count > 0;
CREATE INDEX IF NOT EXISTS idx_conversations_participant_ig ON conversations(participant_ig_id);

-- ROLLBACK
-- ALTER TABLE conversations
-- DROP CONSTRAINT IF EXISTS chk_conversations_priority,
-- DROP CONSTRAINT IF EXISTS chk_conversations_last_message_sender,
-- DROP COLUMN IF EXISTS participant_ig_id,
-- DROP COLUMN IF EXISTS participant_name,
-- DROP COLUMN IF EXISTS participant_is_verified,
-- DROP COLUMN IF EXISTS assigned_to,
-- DROP COLUMN IF EXISTS priority,
-- DROP COLUMN IF EXISTS tags,
-- DROP COLUMN IF EXISTS last_message_text,
-- DROP COLUMN IF EXISTS last_message_sender,
-- DROP COLUMN IF EXISTS archived_at;
-- DROP INDEX IF EXISTS idx_conversations_assigned;
-- DROP INDEX IF EXISTS idx_conversations_priority;
-- DROP INDEX IF EXISTS idx_conversations_unread;
-- DROP INDEX IF EXISTS idx_conversations_participant_ig;
