-- Migration: Create Instagram Message Reactions Table
-- Description: Stores emoji reactions to Instagram messages with action tracking (react/unreact)
-- Date: 2025-10-31

CREATE TABLE IF NOT EXISTS instagram_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) NOT NULL,
    conversation_id UUID,
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    sender_ig_id VARCHAR(255) NOT NULL,
    recipient_ig_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('react', 'unreact')),
    reaction_type VARCHAR(50),
    emoji VARCHAR(10),
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, sender_ig_id, timestamp)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_account ON instagram_message_reactions(account_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON instagram_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_sender ON instagram_message_reactions(sender_ig_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_timestamp ON instagram_message_reactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_action ON instagram_message_reactions(action);

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_message_reactions CASCADE;
