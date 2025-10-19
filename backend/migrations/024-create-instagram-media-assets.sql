-- Migration: Create Instagram Media Assets Table
-- Description: Creates instagram_media_assets table for tracking uploaded media files in MinIO S3
-- Date: 2025-10-19
-- Dependencies: 001-initial-schema.sql, 003-create-client-accounts.sql

CREATE TABLE instagram_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_account_id UUID REFERENCES client_accounts(id) ON DELETE SET NULL,

    -- File information
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,

    -- Media type
    media_type VARCHAR(50) NOT NULL,

    -- Storage
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_url TEXT NOT NULL,

    -- Image/Video metadata
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    thumbnail_url TEXT,

    -- Usage tracking
    used_in_posts INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Tags for organization
    tags JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_media_assets_media_type
        CHECK (media_type IN ('image', 'video')),
    CONSTRAINT chk_media_assets_file_size
        CHECK (file_size > 0),
    CONSTRAINT unique_media_s3_location
        UNIQUE(s3_bucket, s3_key)
);

-- Create indexes for performance
CREATE INDEX idx_media_assets_user ON instagram_media_assets(user_id);
CREATE INDEX idx_media_assets_client_account ON instagram_media_assets(client_account_id);
CREATE INDEX idx_media_assets_media_type ON instagram_media_assets(media_type);
CREATE INDEX idx_media_assets_created_at ON instagram_media_assets(created_at DESC);
CREATE INDEX idx_media_assets_s3_key ON instagram_media_assets(s3_key);

-- Composite index for common queries
CREATE INDEX idx_media_assets_user_type ON instagram_media_assets(user_id, media_type);

-- ROLLBACK
-- DROP TABLE IF EXISTS instagram_media_assets CASCADE;
