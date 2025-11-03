-- Script to investigate and fix lastMessageAt date issues
-- The problem: dates showing as "+057808-10-30T11:43:25.000Z" suggest
-- that timestamps are being stored as epoch milliseconds instead of proper TIMESTAMPTZ

-- Step 1: Check current data
SELECT
    id,
    participant_username,
    last_message_at,
    EXTRACT(EPOCH FROM last_message_at) as epoch_seconds,
    EXTRACT(EPOCH FROM last_message_at) * 1000 as epoch_milliseconds,
    created_at,
    updated_at
FROM conversations
WHERE last_message_at IS NOT NULL
ORDER BY last_message_at DESC
LIMIT 10;

-- Step 2: Check if any dates are in the far future (indicating they were stored as milliseconds)
SELECT
    id,
    participant_username,
    last_message_at,
    CASE
        WHEN last_message_at > '2100-01-01'::timestamptz THEN 'INVALID_FUTURE_DATE'
        WHEN last_message_at < '2020-01-01'::timestamptz THEN 'INVALID_PAST_DATE'
        ELSE 'VALID'
    END as date_status
FROM conversations
WHERE last_message_at IS NOT NULL;

-- Step 3: Fix dates that are in milliseconds
-- If lastMessageAt was accidentally stored as milliseconds since epoch,
-- we need to convert it back to a proper timestamp

-- First, let's see if there are any problematic dates
SELECT COUNT(*) as problematic_count
FROM conversations
WHERE last_message_at > '2100-01-01'::timestamptz;

-- If there are problematic dates, this will fix them:
-- UPDATE conversations
-- SET last_message_at = to_timestamp(EXTRACT(EPOCH FROM last_message_at) / 1000)
-- WHERE last_message_at > '2100-01-01'::timestamptz;

-- Step 4: Verify the fix
-- SELECT
--     id,
--     participant_username,
--     last_message_at,
--     created_at
-- FROM conversations
-- WHERE last_message_at IS NOT NULL
-- ORDER BY last_message_at DESC
-- LIMIT 10;
