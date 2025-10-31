-- Migration: Create Instagram Messaging Postbacks Table
-- Description: Stores button click events from Instagram structured messages (ice breakers, quick replies, persistent menu)
-- Date: 2025-10-31

CREATE TABLE IF NOT EXISTS instagram_messaging_postbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) NOT NULL,
    conversation_id UUID,
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    sender_ig_id VARCHAR(255) NOT NULL,
    recipient_ig_id VARCHAR(255) NOT NULL,
    is_self BOOLEAN DEFAULT FALSE,
    postback_title VARCHAR(255),
    postback_payload TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, sender_ig_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messaging_postbacks_account ON instagram_messaging_postbacks(account_id);
CREATE INDEX IF NOT EXISTS idx_messaging_postbacks_message ON instagram_messaging_postbacks(message_id);
CREATE INDEX IF NOT EXISTS idx_messaging_postbacks_sender ON instagram_messaging_postbacks(sender_ig_id);
CREATE INDEX IF NOT EXISTS idx_messaging_postbacks_timestamp ON instagram_messaging_postbacks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messaging_postbacks_payload ON instagram_messaging_postbacks(postback_payload);
CREATE INDEX IF NOT EXISTS idx_messaging_postbacks_processed ON instagram_messaging_postbacks(processed) WHERE processed = FALSE;

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_messaging_postbacks CASCADE;
