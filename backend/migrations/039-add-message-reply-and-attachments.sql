-- Migration: Add Message Reply and Attachments Support
-- Date: 2025-11-03
-- Description: Adds support for message replies and attachments to the messages table
--              - replied_to_message_id: allows messages to reference another message (for replies/quotes)
--              - attachments: stores array of attachment metadata (files, images, etc.)

-- Add replied_to_message_id column for message threading/replies
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS replied_to_message_id UUID;

-- Add foreign key constraint with ON DELETE SET NULL
-- This ensures if a parent message is deleted, replies just lose the reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_messages_replied_to_message'
  ) THEN
    ALTER TABLE messages
    ADD CONSTRAINT fk_messages_replied_to_message
      FOREIGN KEY (replied_to_message_id)
      REFERENCES messages(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Add attachments column for storing attachment metadata
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create index on replied_to_message_id for query performance
-- This will optimize queries that fetch all replies to a specific message
CREATE INDEX IF NOT EXISTS idx_messages_replied_to
  ON messages(replied_to_message_id)
  WHERE replied_to_message_id IS NOT NULL;

-- Create GIN index on attachments for efficient JSONB queries
-- This allows fast queries like: WHERE attachments @> '[{"type": "image"}]'
CREATE INDEX IF NOT EXISTS idx_messages_attachments
  ON messages USING GIN(attachments)
  WHERE attachments != '[]'::jsonb;

-- Add comment on replied_to_message_id column
COMMENT ON COLUMN messages.replied_to_message_id IS
  'References the message being replied to, creating message threading. NULL if not a reply.';

-- Add comment on attachments column
COMMENT ON COLUMN messages.attachments IS
  'Array of attachment metadata (files, images, videos, etc.) in JSONB format. Default empty array.';

-- Log migration completion
DO $$
DECLARE
  total_messages INTEGER;
  messages_with_replies INTEGER;
  messages_with_attachments INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_messages FROM messages;
  SELECT COUNT(*) INTO messages_with_replies FROM messages WHERE replied_to_message_id IS NOT NULL;
  SELECT COUNT(*) INTO messages_with_attachments FROM messages WHERE attachments != '[]'::jsonb;

  RAISE NOTICE '=== MIGRATION 039 COMPLETED ===';
  RAISE NOTICE 'Total messages: %', total_messages;
  RAISE NOTICE 'Messages with replies: %', messages_with_replies;
  RAISE NOTICE 'Messages with attachments: %', messages_with_attachments;
  RAISE NOTICE 'New columns added: replied_to_message_id, attachments';
  RAISE NOTICE 'Indexes created: idx_messages_replied_to, idx_messages_attachments';
END $$;

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_messages_attachments;
-- DROP INDEX IF EXISTS idx_messages_replied_to;
-- ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_replied_to_message;
-- ALTER TABLE messages DROP COLUMN IF EXISTS attachments;
-- ALTER TABLE messages DROP COLUMN IF EXISTS replied_to_message_id;
