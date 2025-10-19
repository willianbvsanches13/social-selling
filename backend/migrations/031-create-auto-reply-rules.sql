-- Migration: Create Auto Reply Rules Table
-- Description: Stores auto-reply configuration rules for Instagram comments and messages
-- Date: 2025-10-19

CREATE TABLE IF NOT EXISTS auto_reply_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    trigger VARCHAR(50) NOT NULL CHECK (trigger IN ('keyword', 'question', 'greeting', 'away')),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('comment', 'message')),
    pattern TEXT NOT NULL,
    is_regex BOOLEAN DEFAULT FALSE,
    response TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 10, -- Lower number = higher priority
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_account ON auto_reply_rules(account_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_enabled ON auto_reply_rules(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_event_type ON auto_reply_rules(event_type);
CREATE INDEX IF NOT EXISTS idx_auto_reply_rules_priority ON auto_reply_rules(priority ASC);

-- ROLLBACK
-- DROP TABLE IF EXISTS auto_reply_rules CASCADE;
