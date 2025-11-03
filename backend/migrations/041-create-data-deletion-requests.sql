-- Migration: Create Data Deletion Requests Table
-- Description: Creates the data_deletion_requests table for managing user data deletion requests
-- Dependencies: users table must exist
-- Date: 2025-11-03
-- Author: Feature Delivery Pipeline

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  confirmation_code TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Foreign key constraint with CASCADE delete
  CONSTRAINT fk_data_deletion_requests_user_id
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  -- Check constraint for valid source enum
  CONSTRAINT chk_data_deletion_source CHECK (
    source IN ('user_app', 'meta_callback', 'email')
  ),

  -- Check constraint for valid status enum
  CONSTRAINT chk_data_deletion_status CHECK (
    status IN ('pending', 'in_progress', 'completed', 'failed')
  )
);

-- Create indexes for performance
CREATE INDEX idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE UNIQUE INDEX idx_data_deletion_requests_confirmation_code ON data_deletion_requests(confirmation_code);
CREATE INDEX idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX idx_data_deletion_requests_requested_at ON data_deletion_requests(requested_at DESC);

-- Create GIN index for JSONB metadata
CREATE INDEX idx_data_deletion_requests_metadata ON data_deletion_requests USING GIN(metadata);

-- Apply updated_at trigger
CREATE TRIGGER update_data_deletion_requests_updated_at
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE data_deletion_requests IS 'Stores user data deletion requests from various sources (app, Meta callbacks, email)';
COMMENT ON COLUMN data_deletion_requests.user_id IS 'Reference to the user requesting deletion';
COMMENT ON COLUMN data_deletion_requests.confirmation_code IS 'Unique confirmation code for the deletion request';
COMMENT ON COLUMN data_deletion_requests.source IS 'Source of the deletion request: user_app, meta_callback, or email';
COMMENT ON COLUMN data_deletion_requests.status IS 'Status of the deletion request: pending, in_progress, completed, or failed';
COMMENT ON COLUMN data_deletion_requests.requested_at IS 'Timestamp when the deletion was requested';
COMMENT ON COLUMN data_deletion_requests.completed_at IS 'Timestamp when the deletion was completed';
COMMENT ON COLUMN data_deletion_requests.error_message IS 'Error message if deletion failed';
COMMENT ON COLUMN data_deletion_requests.metadata IS 'Additional metadata about the deletion request (JSONB)';

-- ROLLBACK SECTION (executed during migrate:down)
-- DROP TRIGGER IF EXISTS update_data_deletion_requests_updated_at ON data_deletion_requests;
-- DROP TABLE IF EXISTS data_deletion_requests CASCADE;
