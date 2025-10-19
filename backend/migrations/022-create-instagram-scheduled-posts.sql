-- Migration: Create Instagram Scheduled Posts Table
-- Description: Creates instagram_scheduled_posts table for scheduling Instagram posts
-- Date: 2025-10-19
-- Dependencies: 003-create-client-accounts.sql, 001-initial-schema.sql

CREATE TABLE instagram_scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,

    -- Post content
    caption TEXT NOT NULL,
    media_urls JSONB NOT NULL DEFAULT '[]',
    media_type VARCHAR(50) NOT NULL,
    product_tags JSONB DEFAULT '[]',
    location_id VARCHAR(255),

    -- Template
    template_id UUID REFERENCES instagram_post_templates(id) ON DELETE SET NULL,
    template_variables JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    publish_attempts INTEGER DEFAULT 0,
    last_publish_error TEXT,

    -- Instagram response
    instagram_media_id VARCHAR(255),
    instagram_media_url TEXT,
    permalink TEXT,

    -- Analytics
    initial_likes INTEGER DEFAULT 0,
    initial_comments INTEGER DEFAULT 0,
    initial_reach INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_scheduled_posts_media_type
        CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL', 'REELS')),
    CONSTRAINT chk_scheduled_posts_status
        CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'cancelled'))
);

-- Create indexes for performance
CREATE INDEX idx_scheduled_posts_client_account ON instagram_scheduled_posts(client_account_id);
CREATE INDEX idx_scheduled_posts_user ON instagram_scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status ON instagram_scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_for ON instagram_scheduled_posts(scheduled_for);
CREATE INDEX idx_scheduled_posts_published_at ON instagram_scheduled_posts(published_at DESC);
CREATE INDEX idx_scheduled_posts_template ON instagram_scheduled_posts(template_id);

-- Composite index for common queries
CREATE INDEX idx_scheduled_posts_account_status ON instagram_scheduled_posts(client_account_id, status);
CREATE INDEX idx_scheduled_posts_account_scheduled ON instagram_scheduled_posts(client_account_id, scheduled_for);

-- Apply updated_at trigger
CREATE TRIGGER update_instagram_scheduled_posts_updated_at
  BEFORE UPDATE ON instagram_scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_instagram_scheduled_posts_updated_at ON instagram_scheduled_posts;
-- DROP TABLE IF EXISTS instagram_scheduled_posts CASCADE;
