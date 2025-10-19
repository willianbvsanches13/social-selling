-- PostgreSQL Extensions Initialization Script
-- Description: Creates required PostgreSQL extensions for the application
-- Extensions:
--   - uuid-ossp: UUID generation functions
--   - pgcrypto: Encryption functions for sensitive data (OAuth tokens)
--   - pg_trgm: Trigram matching for full-text search on messages
--   - pg_stat_statements: Query performance monitoring

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Verify extensions are installed
DO $$
DECLARE
    extension_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO extension_count
    FROM pg_extension
    WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'pg_stat_statements');

    IF extension_count < 4 THEN
        RAISE EXCEPTION 'Not all required extensions were installed. Expected 4, found %', extension_count;
    END IF;

    RAISE NOTICE 'All required PostgreSQL extensions installed successfully';
END $$;

-- Display installed extensions
SELECT
    extname AS "Extension Name",
    extversion AS "Version",
    extrelocatable AS "Relocatable"
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'pg_stat_statements')
ORDER BY extname;
