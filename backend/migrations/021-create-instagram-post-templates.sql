-- Migration: Create Instagram Post Templates Table
-- Description: Creates instagram_post_templates table for reusable post templates with variable substitution
-- Date: 2025-10-19
-- Dependencies: 001-initial-schema.sql, 003-create-client-accounts.sql

CREATE TABLE instagram_post_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),

    caption_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    default_media_type VARCHAR(50) DEFAULT 'IMAGE',

    suggested_hashtags JSONB DEFAULT '[]',
    suggested_mentions JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_post_templates_category
        CHECK (category IN ('product_launch', 'promotion', 'tip', 'testimonial', 'behind_scenes', 'announcement') OR category IS NULL),
    CONSTRAINT chk_post_templates_media_type
        CHECK (default_media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL', 'REELS'))
);

-- Create indexes for performance
CREATE INDEX idx_post_templates_user ON instagram_post_templates(user_id);
CREATE INDEX idx_post_templates_client_account ON instagram_post_templates(client_account_id);
CREATE INDEX idx_post_templates_category ON instagram_post_templates(category);
CREATE INDEX idx_post_templates_active ON instagram_post_templates(is_active);
CREATE INDEX idx_post_templates_user_active ON instagram_post_templates(user_id, is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_instagram_post_templates_updated_at
  BEFORE UPDATE ON instagram_post_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_instagram_post_templates_updated_at ON instagram_post_templates;
-- DROP TABLE IF EXISTS instagram_post_templates CASCADE;
