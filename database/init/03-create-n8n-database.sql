-- ================================
-- n8n Database Initialization
-- ================================
-- This script creates the database and user for n8n
-- It runs automatically when PostgreSQL container starts

-- Create n8n user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8n_user') THEN
        CREATE USER n8n_user WITH ENCRYPTED PASSWORD 'NWIakDuhRtno6yLqxBpzNye8k2J1yUPLkNLhTkVB4Ss=';
    END IF;
END
$$;

-- Create n8n database
SELECT 'CREATE DATABASE n8n OWNER n8n_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Grant all privileges to n8n_user on n8n database
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n_user;

-- Connect to n8n database and set up schema
\c n8n

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO n8n_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO n8n_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO n8n_user;

-- Log success
\echo '✅ n8n database and user created successfully'
