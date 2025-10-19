-- Migration: Create Instagram Comments Table
-- Description: Stores Instagram comments on posts for webhook processing
-- Date: 2025-10-19

CREATE TABLE IF NOT EXISTS instagram_comments (
    id VARCHAR(255) PRIMARY KEY, -- Instagram comment ID
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    from_id VARCHAR(255) NOT NULL,
    from_username VARCHAR(255) NOT NULL,
    media_id VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    parent_id VARCHAR(255), -- For reply comments
    like_count INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_instagram_comments_account ON instagram_comments(account_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_media ON instagram_comments(media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_from ON instagram_comments(from_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_timestamp ON instagram_comments(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_parent ON instagram_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instagram_comments_text_search
    ON instagram_comments USING GIN(to_tsvector('english', text));

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_comments CASCADE;
