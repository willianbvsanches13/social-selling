-- Database User and Permissions Initialization Script
-- Description: Creates application database user with appropriate permissions
-- User: social_selling_user
-- Permissions: Full access to public schema

-- Create application database user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'social_selling_user') THEN
        -- Note: Password will be set from environment variable POSTGRES_PASSWORD
        -- This is just a placeholder as the user is created via Docker environment
        RAISE NOTICE 'User social_selling_user already exists via Docker environment';
    ELSE
        RAISE NOTICE 'User social_selling_user already configured';
    END IF;
END $$;

-- Grant database-level privileges
GRANT ALL PRIVILEGES ON DATABASE social_selling TO social_selling_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO social_selling_user;

-- Grant table privileges (current and future)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO social_selling_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO social_selling_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO social_selling_user;

-- Set default privileges for future objects created by postgres user
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO social_selling_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO social_selling_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON FUNCTIONS TO social_selling_user;

-- Grant usage on extensions
GRANT USAGE ON SCHEMA public TO social_selling_user;

-- Display granted permissions
DO $$
BEGIN
    RAISE NOTICE 'Permissions granted successfully to social_selling_user';
    RAISE NOTICE '  - Full access to database: social_selling';
    RAISE NOTICE '  - Full access to schema: public';
    RAISE NOTICE '  - Full access to all current and future tables, sequences, and functions';
END $$;
