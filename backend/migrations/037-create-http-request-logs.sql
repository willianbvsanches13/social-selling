-- Migration: Create HTTP Request Logs Table
-- Description: Stores all HTTP requests and responses for audit and debugging
-- Created: 2025-10-31

CREATE TABLE IF NOT EXISTS http_request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Request information
    method VARCHAR(10) NOT NULL,
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    query_params JSONB,

    -- Headers
    request_headers JSONB,
    response_headers JSONB,

    -- Body
    request_body JSONB,
    response_body JSONB,

    -- Response information
    status_code INTEGER,
    response_time_ms INTEGER,

    -- Error information
    error_message TEXT,
    error_stack TEXT,

    -- User context
    user_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes for common queries
    CONSTRAINT http_request_logs_method_check CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'))
);

-- Indexes for performance
CREATE INDEX idx_http_request_logs_created_at ON http_request_logs(created_at DESC);
CREATE INDEX idx_http_request_logs_method ON http_request_logs(method);
CREATE INDEX idx_http_request_logs_status_code ON http_request_logs(status_code);
CREATE INDEX idx_http_request_logs_path ON http_request_logs(path);
CREATE INDEX idx_http_request_logs_user_id ON http_request_logs(user_id);

-- Add comment to table
COMMENT ON TABLE http_request_logs IS 'Stores all HTTP requests and responses for audit and debugging purposes';
COMMENT ON COLUMN http_request_logs.response_time_ms IS 'Time taken to process the request in milliseconds';
COMMENT ON COLUMN http_request_logs.query_params IS 'URL query parameters as JSON';
COMMENT ON COLUMN http_request_logs.request_headers IS 'Request headers as JSON (sensitive headers are filtered)';
COMMENT ON COLUMN http_request_logs.response_headers IS 'Response headers as JSON';
