-- Migration: Create Instagram Mentions Table
-- Description: Stores Instagram @mentions in stories and posts
-- Date: 2025-10-19

CREATE TABLE IF NOT EXISTS instagram_mentions (
    id VARCHAR(255) PRIMARY KEY, -- Unique mention ID
    media_id VARCHAR(255) NOT NULL,
    comment_id VARCHAR(255), -- If mentioned in a comment
    timestamp TIMESTAMPTZ NOT NULL,
    mentioned_in VARCHAR(50) NOT NULL CHECK (mentioned_in IN ('story', 'post', 'comment')),
    from_id VARCHAR(255) NOT NULL,
    from_username VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instagram_mentions_account ON instagram_mentions(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_mentions_media ON instagram_mentions(media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_mentions_from ON instagram_mentions(from_id);
CREATE INDEX IF NOT EXISTS idx_instagram_mentions_timestamp ON instagram_mentions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_mentions_type ON instagram_mentions(mentioned_in);

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_mentions CASCADE;
