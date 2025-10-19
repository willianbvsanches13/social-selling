-- Migration: Create Message-related Triggers
-- Description: Creates triggers for managing unread counts in conversations
-- Dependencies: 007-create-conversations.sql, 008-create-messages.sql

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS message_increment_unread ON messages;
DROP TRIGGER IF EXISTS message_decrement_unread ON messages;

-- Function to increment unread count when customer sends message
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'customer' AND NEW.is_read = FALSE THEN
    UPDATE conversations
    SET unread_count = unread_count + 1,
        last_message_at = NEW.sent_at
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type = 'user' THEN
    UPDATE conversations
    SET last_message_at = NEW.sent_at
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment unread count on new message
CREATE TRIGGER message_increment_unread
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();

-- Function to decrement unread count when message is marked as read
CREATE OR REPLACE FUNCTION decrement_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
    UPDATE conversations
    SET unread_count = GREATEST(unread_count - 1, 0)
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to decrement unread count when message is marked as read
CREATE TRIGGER message_decrement_unread
  AFTER UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION decrement_unread_count();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS message_decrement_unread ON messages;
-- DROP TRIGGER IF EXISTS message_increment_unread ON messages;
-- DROP FUNCTION IF EXISTS decrement_unread_count();
-- DROP FUNCTION IF EXISTS increment_unread_count();
