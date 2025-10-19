-- Migration: Create Instagram Webhook Subscriptions Table
-- Description: Tracks webhook subscriptions for each Instagram account
-- Date: 2025-10-19

CREATE TABLE IF NOT EXISTS instagram_webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instagram_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    subscription_fields JSONB NOT NULL DEFAULT '[]',
    callback_url TEXT NOT NULL,
    verify_token VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ,
    last_event_received_at TIMESTAMPTZ,
    events_received_count INTEGER DEFAULT 0,
    subscription_errors INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(instagram_account_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON instagram_webhook_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_account ON instagram_webhook_subscriptions(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_created_at ON instagram_webhook_subscriptions(created_at DESC);

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_webhook_subscriptions CASCADE;
