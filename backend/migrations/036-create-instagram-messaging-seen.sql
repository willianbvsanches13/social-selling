-- Migration: Create Instagram Messaging Seen Table
-- Description: Stores read receipts for Instagram messages to track engagement and response rates
-- Date: 2025-10-31

CREATE TABLE IF NOT EXISTS instagram_messaging_seen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_message_id VARCHAR(255) NOT NULL,
    conversation_id UUID,
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    reader_ig_id VARCHAR(255) NOT NULL,
    recipient_ig_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(last_message_id, reader_ig_id, timestamp)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messaging_seen_account ON instagram_messaging_seen(account_id);
CREATE INDEX IF NOT EXISTS idx_messaging_seen_message ON instagram_messaging_seen(last_message_id);
CREATE INDEX IF NOT EXISTS idx_messaging_seen_reader ON instagram_messaging_seen(reader_ig_id);
CREATE INDEX IF NOT EXISTS idx_messaging_seen_timestamp ON instagram_messaging_seen(timestamp DESC);

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_messaging_seen CASCADE;
