-- Migration: 027-create-instagram-story-insights.sql
-- Created: 2025-10-19
-- Description: Create table for storing Instagram story insights (impressions, taps, exits)

CREATE TABLE instagram_story_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    story_ig_id VARCHAR(255) NOT NULL,

    -- Story info
    media_type VARCHAR(50),
    media_url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Engagement metrics
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,

    -- Interaction metrics
    taps_forward INTEGER DEFAULT 0,
    taps_back INTEGER DEFAULT 0,
    exits INTEGER DEFAULT 0,

    -- Last updated
    insights_fetched_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(client_account_id, story_ig_id)
);

CREATE INDEX idx_story_insights_account ON instagram_story_insights(client_account_id);
CREATE INDEX idx_story_insights_story_id ON instagram_story_insights(story_ig_id);
CREATE INDEX idx_story_insights_timestamp ON instagram_story_insights(timestamp DESC);
