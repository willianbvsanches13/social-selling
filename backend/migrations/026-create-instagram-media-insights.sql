-- Migration: 026-create-instagram-media-insights.sql
-- Created: 2025-10-19
-- Description: Create table for storing Instagram media insights (likes, comments, engagement)

CREATE TABLE instagram_media_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    media_ig_id VARCHAR(255) NOT NULL,

    -- Media info
    media_type VARCHAR(50), -- IMAGE, VIDEO, CAROUSEL_ALBUM, REELS
    media_url TEXT,
    permalink TEXT,
    caption TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,

    -- Engagement metrics
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    saved INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,

    -- Reach metrics
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,

    -- Video metrics
    video_views INTEGER,

    -- Engagement rate
    engagement_rate DECIMAL(5,2), -- Calculated: (likes + comments) / reach * 100

    -- Source breakdown (from impressions)
    from_home INTEGER,
    from_hashtags INTEGER,
    from_explore INTEGER,
    from_other INTEGER,

    -- Last updated
    insights_fetched_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(client_account_id, media_ig_id)
);

CREATE INDEX idx_media_insights_account ON instagram_media_insights(client_account_id);
CREATE INDEX idx_media_insights_media_id ON instagram_media_insights(media_ig_id);
CREATE INDEX idx_media_insights_timestamp ON instagram_media_insights(timestamp DESC);
CREATE INDEX idx_media_insights_engagement ON instagram_media_insights(engagement_rate DESC);
CREATE INDEX idx_media_insights_reach ON instagram_media_insights(reach DESC);
