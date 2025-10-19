-- Migration: Create Analytics Tables and Views
-- Description: Creates analytics_events table and materialized view for analytics aggregation
-- Dependencies: 001-initial-schema.sql (users), 003-create-client-accounts.sql

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL, -- 'engagement', 'sales', 'message', 'content'
  entity_type TEXT, -- 'product', 'message', 'conversation', 'post'
  entity_id UUID,
  value NUMERIC(10, 2),
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_client_account ON analytics_events(client_account_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_occurred_at ON analytics_events(occurred_at DESC);
CREATE INDEX idx_analytics_entity ON analytics_events(entity_type, entity_id)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;
CREATE INDEX idx_analytics_user_date_category
  ON analytics_events(user_id, occurred_at DESC, event_category);

-- Materialized view for daily aggregations
CREATE MATERIALIZED VIEW analytics_daily_summary AS
SELECT
  user_id,
  client_account_id,
  DATE(occurred_at) as date,
  event_category,
  event_type,
  COUNT(*) as event_count,
  SUM(value) as total_value,
  AVG(value) as avg_value
FROM analytics_events
GROUP BY user_id, client_account_id, DATE(occurred_at), event_category, event_type;

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_analytics_daily_unique
  ON analytics_daily_summary(user_id, client_account_id, date, event_category, event_type);
CREATE INDEX idx_analytics_daily_date ON analytics_daily_summary(date DESC);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_analytics_daily_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS refresh_analytics_daily_summary();
-- DROP MATERIALIZED VIEW IF EXISTS analytics_daily_summary;
-- DROP TABLE IF EXISTS analytics_events CASCADE;
