-- Migration: Email Logs Table
-- Description: Creates the email_logs table for tracking email delivery status
-- Dependencies: users table must exist

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_address TEXT NOT NULL,
  from_address VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  template VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  message_id VARCHAR(255),
  provider VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  bounce_reason TEXT,
  complained_at TIMESTAMP,
  error TEXT,
  context JSONB,
  tags TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_email_status CHECK (
    status IN ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'FAILED')
  ),
  CONSTRAINT chk_email_provider CHECK (
    provider IN ('sendgrid', 'mailgun', 'ses', 'smtp')
  )
);

-- Create indexes for performance
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_to_address ON email_logs(to_address);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_template ON email_logs(template);
CREATE INDEX idx_email_logs_message_id ON email_logs(message_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX idx_email_logs_provider ON email_logs(provider);

-- Create GIN index for tags array
CREATE INDEX idx_email_logs_tags ON email_logs USING GIN(tags);

-- Create GIN index for JSONB context
CREATE INDEX idx_email_logs_context ON email_logs USING GIN(context);

-- Apply updated_at trigger
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add email bounce tracking fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_bounced BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_bounced_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_out_at TIMESTAMP;

-- Create index for email bounce status
CREATE INDEX IF NOT EXISTS idx_users_email_bounced ON users(email_bounced) WHERE email_bounced = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_email_opt_out ON users(email_opt_out) WHERE email_opt_out = TRUE;
