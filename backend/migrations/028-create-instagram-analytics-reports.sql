-- Migration: 028-create-instagram-analytics-reports.sql
-- Created: 2025-10-19
-- Description: Create table for storing generated analytics reports

CREATE TABLE instagram_analytics_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Report config
    report_type VARCHAR(50) NOT NULL, -- overview, content, audience, engagement
    period VARCHAR(50) NOT NULL, -- day, week, month, custom
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Report data (stored as JSONB for flexibility)
    summary JSONB NOT NULL DEFAULT '{}',
    charts_data JSONB DEFAULT '{}',
    top_posts JSONB DEFAULT '[]',
    insights JSONB DEFAULT '{}',

    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_reports_account ON instagram_analytics_reports(client_account_id);
CREATE INDEX idx_analytics_reports_user ON instagram_analytics_reports(user_id);
CREATE INDEX idx_analytics_reports_type ON instagram_analytics_reports(report_type);
CREATE INDEX idx_analytics_reports_period ON instagram_analytics_reports(start_date DESC, end_date DESC);
