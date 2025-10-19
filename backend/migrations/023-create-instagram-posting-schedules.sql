-- Migration: Create Instagram Posting Schedules Table
-- Description: Creates instagram_posting_schedules table for optimal posting times per account
-- Date: 2025-10-19
-- Dependencies: 003-create-client-accounts.sql

CREATE TABLE instagram_posting_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,

    -- Schedule configuration
    day_of_week INTEGER NOT NULL,
    time_slots JSONB NOT NULL DEFAULT '[]',
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',

    -- Optimal time analysis
    is_optimal BOOLEAN DEFAULT FALSE,
    engagement_score DECIMAL(5,2),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_posting_schedules_day_of_week
        CHECK (day_of_week >= 0 AND day_of_week <= 6),
    CONSTRAINT chk_posting_schedules_engagement_score
        CHECK (engagement_score IS NULL OR (engagement_score >= 0 AND engagement_score <= 100)),
    CONSTRAINT unique_posting_schedule_per_day
        UNIQUE(client_account_id, day_of_week)
);

-- Create indexes for performance
CREATE INDEX idx_posting_schedules_client_account ON instagram_posting_schedules(client_account_id);
CREATE INDEX idx_posting_schedules_optimal ON instagram_posting_schedules(is_optimal);
CREATE INDEX idx_posting_schedules_active ON instagram_posting_schedules(is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_instagram_posting_schedules_updated_at
  BEFORE UPDATE ON instagram_posting_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_instagram_posting_schedules_updated_at ON instagram_posting_schedules;
-- DROP TABLE IF EXISTS instagram_posting_schedules CASCADE;
