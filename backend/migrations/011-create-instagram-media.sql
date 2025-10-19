-- Migration: Create Instagram Media Cache Table
-- Description: Creates instagram_media table for caching Instagram media data
-- Dependencies: 003-create-client-accounts.sql

CREATE TABLE instagram_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  platform_media_id TEXT NOT NULL UNIQUE,
  media_type TEXT NOT NULL,
  media_url TEXT,
  thumbnail_url TEXT,
  permalink TEXT,
  caption TEXT,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  timestamp TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_instagram_media_type
    CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'))
);

-- Create indexes for performance
CREATE INDEX idx_instagram_media_client_account ON instagram_media(client_account_id);
CREATE UNIQUE INDEX idx_instagram_media_platform_id ON instagram_media(platform_media_id);
CREATE INDEX idx_instagram_media_timestamp ON instagram_media(timestamp DESC);

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_media CASCADE;
