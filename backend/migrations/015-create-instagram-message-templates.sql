-- Migration: Create Instagram Message Templates Table
-- Description: Creates message templates table for storing user-created message templates with variables
-- Dependencies: 003-create-client-accounts.sql, 001-initial-schema.sql

CREATE TABLE instagram_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES client_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  media_urls JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_template_category
    CHECK (category IN ('greeting', 'product_info', 'pricing', 'closing', 'faq'))
);

-- Create indexes for performance
CREATE INDEX idx_message_templates_user ON instagram_message_templates(user_id);
CREATE INDEX idx_message_templates_account ON instagram_message_templates(instagram_account_id);
CREATE INDEX idx_message_templates_category ON instagram_message_templates(category);
CREATE INDEX idx_message_templates_active ON instagram_message_templates(is_active);
CREATE INDEX idx_message_templates_user_account
  ON instagram_message_templates(user_id, instagram_account_id, is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_instagram_message_templates_updated_at
  BEFORE UPDATE ON instagram_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS update_instagram_message_templates_updated_at ON instagram_message_templates;
-- DROP TABLE IF EXISTS instagram_message_templates CASCADE;
