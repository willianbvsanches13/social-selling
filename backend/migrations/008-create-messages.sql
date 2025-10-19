-- Migration: Create Messages Table
-- Description: Creates messages table for storing all messages from Instagram/WhatsApp
-- Dependencies: 007-create-conversations.sql

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  platform_message_id TEXT NOT NULL UNIQUE,
  sender_type TEXT NOT NULL, -- 'user' or 'customer'
  sender_platform_id TEXT,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_messages_sender_type
    CHECK (sender_type IN ('user', 'customer')),
  CONSTRAINT chk_messages_message_type
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'story_mention', 'story_reply'))
);

-- Create indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE UNIQUE INDEX idx_messages_platform_id ON messages(platform_message_id);
CREATE INDEX idx_messages_conversation_sent
  ON messages(conversation_id, sent_at DESC);
CREATE INDEX idx_messages_content_search
  ON messages USING GIN(to_tsvector('portuguese', content))
  WHERE message_type = 'text' AND content IS NOT NULL;

-- ROLLBACK
-- DROP TABLE IF EXISTS messages CASCADE;
