-- Migration: Add STORIES to media_type constraint for instagram_scheduled_posts
-- Date: 2025-10-31
-- Description: Updates the check constraint to include 'STORIES' as a valid media type

-- Drop the old constraint
ALTER TABLE instagram_scheduled_posts
    DROP CONSTRAINT IF EXISTS chk_scheduled_posts_media_type;

-- Add the new constraint with STORIES included
ALTER TABLE instagram_scheduled_posts
    ADD CONSTRAINT chk_scheduled_posts_media_type
        CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL', 'REELS', 'STORIES'));

-- ROLLBACK
-- ALTER TABLE instagram_scheduled_posts
--     DROP CONSTRAINT IF EXISTS chk_scheduled_posts_media_type;
-- ALTER TABLE instagram_scheduled_posts
--     ADD CONSTRAINT chk_scheduled_posts_media_type
--         CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL', 'REELS'));
