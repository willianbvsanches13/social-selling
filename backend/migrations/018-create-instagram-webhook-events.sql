-- Migration: Create Instagram Webhook Events Table
-- Description: Stores all Instagram webhook events for audit trail and processing
-- Date: 2025-10-19

CREATE TABLE IF NOT EXISTS instagram_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    instagram_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
    object_type VARCHAR(50),
    object_id VARCHAR(255),
    sender_ig_id VARCHAR(255),
    sender_username VARCHAR(255),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    processing_attempts INTEGER DEFAULT 0,
    last_processing_error TEXT,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES instagram_webhook_events(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON instagram_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_account ON instagram_webhook_events(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON instagram_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON instagram_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON instagram_webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_sender ON instagram_webhook_events(sender_ig_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_is_duplicate ON instagram_webhook_events(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_attempts ON instagram_webhook_events(processing_attempts) WHERE processed = FALSE;

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_webhook_events CASCADE;
