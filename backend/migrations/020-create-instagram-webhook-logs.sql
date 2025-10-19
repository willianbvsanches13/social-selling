-- Migration: Create Instagram Webhook Logs Table
-- Description: Stores detailed logs for webhook processing and debugging
-- Date: 2025-10-19

CREATE TABLE IF NOT EXISTS instagram_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES instagram_webhook_events(id) ON DELETE CASCADE,
    log_level VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON instagram_webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_level ON instagram_webhook_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON instagram_webhook_logs(created_at DESC);

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_webhook_logs CASCADE;
