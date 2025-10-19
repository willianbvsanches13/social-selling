-- Migration: Create Auto Reply Logs Table
-- Description: Tracks auto-replies sent by the system
-- Date: 2025-10-19

CREATE TABLE IF NOT EXISTS auto_reply_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL, -- The comment/message ID that triggered the reply
    rule_id UUID NOT NULL REFERENCES auto_reply_rules(id) ON DELETE CASCADE,
    reply_message_id VARCHAR(255) NOT NULL, -- The ID of the sent reply
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_reply_logs_account ON auto_reply_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_logs_rule ON auto_reply_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_reply_logs_sent_at ON auto_reply_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_reply_logs_event ON auto_reply_logs(event_id);

-- ROLLBACK
-- DROP TABLE IF EXISTS auto_reply_logs CASCADE;
