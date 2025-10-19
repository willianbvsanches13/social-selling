-- Migration: 025-create-instagram-account-insights.sql
-- Created: 2025-10-19
-- Description: Create table for storing Instagram account insights (followers, reach, impressions, audience)

CREATE TABLE instagram_account_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,

    -- Date range for metrics
    date DATE NOT NULL,
    period VARCHAR(50) NOT NULL, -- day, week, days_28

    -- Follower metrics
    follower_count INTEGER,
    following_count INTEGER,
    follower_change INTEGER, -- Change from previous period

    -- Reach metrics
    reach INTEGER, -- Accounts reached
    impressions INTEGER, -- Total impressions

    -- Engagement metrics
    profile_views INTEGER,
    website_clicks INTEGER,
    email_contacts INTEGER,
    phone_call_clicks INTEGER,
    text_message_clicks INTEGER,
    get_directions_clicks INTEGER,

    -- Content metrics
    posts_count INTEGER,
    stories_count INTEGER,

    -- Audience metrics (stored as JSONB for flexibility)
    audience_city JSONB DEFAULT '{}',
    audience_country JSONB DEFAULT '{}',
    audience_gender_age JSONB DEFAULT '{}',
    audience_locale JSONB DEFAULT '{}',

    -- Online followers
    online_followers JSONB DEFAULT '{}', -- Hour-by-hour breakdown

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(client_account_id, date, period)
);

CREATE INDEX idx_account_insights_account ON instagram_account_insights(client_account_id);
CREATE INDEX idx_account_insights_date ON instagram_account_insights(date DESC);
CREATE INDEX idx_account_insights_period ON instagram_account_insights(period);
CREATE INDEX idx_account_insights_account_date ON instagram_account_insights(client_account_id, date DESC);
