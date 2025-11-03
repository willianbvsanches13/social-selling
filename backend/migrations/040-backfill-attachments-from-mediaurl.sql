-- Migration: 040 - Backfill attachments from mediaUrl
-- Description: Migrates existing media_url data to the new attachments JSONB column
-- Date: 2025-11-03
-- Author: Feature Delivery Pipeline
--
-- This migration converts legacy media_url values into the new attachments format
-- to maintain backward compatibility and preserve all existing media content.

-- ============================================================================
-- MIGRATION UP
-- ============================================================================

DO $$
DECLARE
  v_total_messages INTEGER;
  v_messages_with_media INTEGER;
  v_already_migrated INTEGER;
  v_to_migrate INTEGER;
  v_migrated INTEGER := 0;
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_duration INTERVAL;
BEGIN
  v_start_time := clock_timestamp();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting attachments backfill migration';
  RAISE NOTICE '========================================';

  -- Count total messages
  SELECT COUNT(*) INTO v_total_messages FROM messages;
  RAISE NOTICE 'Total messages in database: %', v_total_messages;

  -- Count messages with media_url
  SELECT COUNT(*) INTO v_messages_with_media
  FROM messages
  WHERE media_url IS NOT NULL AND media_url != '';
  RAISE NOTICE 'Messages with media_url: %', v_messages_with_media;

  -- Count already migrated (have both media_url and attachments)
  SELECT COUNT(*) INTO v_already_migrated
  FROM messages
  WHERE media_url IS NOT NULL
    AND media_url != ''
    AND attachments IS NOT NULL
    AND attachments != '[]'::jsonb;
  RAISE NOTICE 'Already migrated: %', v_already_migrated;

  -- Calculate messages to migrate
  v_to_migrate := v_messages_with_media - v_already_migrated;
  RAISE NOTICE 'Messages to migrate: %', v_to_migrate;
  RAISE NOTICE '----------------------------------------';

  IF v_to_migrate = 0 THEN
    RAISE NOTICE 'No messages to migrate. Migration already complete!';
    RAISE NOTICE '========================================';
    RETURN;
  END IF;

  RAISE NOTICE 'Starting migration of % messages...', v_to_migrate;

  -- Perform the backfill migration
  -- This updates messages that have media_url but no attachments
  UPDATE messages
  SET
    attachments = jsonb_build_array(
      jsonb_build_object(
        'url', media_url,
        'type', CASE
          -- Image formats
          WHEN media_url ~* '\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$' THEN 'image'
          -- Video formats
          WHEN media_url ~* '\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v)(\?.*)?$' THEN 'video'
          -- Audio formats
          WHEN media_url ~* '\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$' THEN 'audio'
          -- Document formats
          WHEN media_url ~* '\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?.*)?$' THEN 'document'
          -- Default to file for unknown types
          ELSE 'file'
        END,
        'size', 0,
        'name', COALESCE(
          -- Extract filename from URL
          substring(media_url from '[^/]+$'),
          'legacy-attachment'
        ),
        'mimeType', CASE
          WHEN media_url ~* '\.(jpg|jpeg)(\?.*)?$' THEN 'image/jpeg'
          WHEN media_url ~* '\.png(\?.*)?$' THEN 'image/png'
          WHEN media_url ~* '\.gif(\?.*)?$' THEN 'image/gif'
          WHEN media_url ~* '\.webp(\?.*)?$' THEN 'image/webp'
          WHEN media_url ~* '\.mp4(\?.*)?$' THEN 'video/mp4'
          WHEN media_url ~* '\.webm(\?.*)?$' THEN 'video/webm'
          ELSE 'application/octet-stream'
        END,
        'uploadedAt', COALESCE(created_at, NOW()),
        'source', 'legacy_migration'
      )
    ),
    updated_at = NOW()
  WHERE
    media_url IS NOT NULL
    AND media_url != ''
    AND (attachments IS NULL OR attachments = '[]'::jsonb);

  -- Get number of rows affected
  GET DIAGNOSTICS v_migrated = ROW_COUNT;

  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;

  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Messages migrated: %', v_migrated;
  RAISE NOTICE 'Duration: %', v_duration;
  RAISE NOTICE 'Average: % ms per message',
    CASE WHEN v_migrated > 0
      THEN ROUND((EXTRACT(EPOCH FROM v_duration) * 1000 / v_migrated)::numeric, 2)
      ELSE 0
    END;
  RAISE NOTICE '========================================';

  -- Verify migration
  PERFORM pg_sleep(0.1); -- Small delay to ensure consistency

  SELECT COUNT(*) INTO v_messages_with_media
  FROM messages
  WHERE media_url IS NOT NULL AND media_url != '';

  SELECT COUNT(*) INTO v_already_migrated
  FROM messages
  WHERE media_url IS NOT NULL
    AND media_url != ''
    AND attachments IS NOT NULL
    AND attachments != '[]'::jsonb;

  RAISE NOTICE 'Post-migration verification:';
  RAISE NOTICE '  Messages with media_url: %', v_messages_with_media;
  RAISE NOTICE '  Now with attachments: %', v_already_migrated;
  RAISE NOTICE '  Coverage: %%%',
    CASE WHEN v_messages_with_media > 0
      THEN ROUND((v_already_migrated::numeric / v_messages_with_media * 100)::numeric, 2)
      ELSE 0
    END;

  IF v_already_migrated = v_messages_with_media THEN
    RAISE NOTICE '✓ Migration verification PASSED - 100%% coverage';
  ELSE
    RAISE WARNING '⚠ Some messages may not have been migrated. Please investigate.';
  END IF;

  RAISE NOTICE '========================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration failed: % - %', SQLERRM, SQLSTATE;
END $$;

-- Create index on attachments for performance (if not exists from migration 039)
CREATE INDEX IF NOT EXISTS idx_messages_attachments
ON messages USING gin(attachments)
WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN messages.attachments IS
  'JSONB array of attachment metadata. Migrated from legacy media_url field.';

RAISE NOTICE 'Backfill migration 040 completed successfully!';

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- To rollback this migration (clear attachments that were backfilled):
--
-- UPDATE messages
-- SET attachments = '[]'::jsonb
-- WHERE attachments @> '[{"source": "legacy_migration"}]'::jsonb;
--
-- Note: This only clears attachments created by this migration.
-- It does NOT restore the original state if attachments were manually added.
