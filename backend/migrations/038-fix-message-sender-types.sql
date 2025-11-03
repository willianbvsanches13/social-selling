-- Migration: Fix sender_type for existing messages
-- Date: 2025-11-02
-- Description: Corrects sender_type field for messages by comparing sender_platform_id
--              with the Instagram page ID from client_accounts
--
-- Logic:
--   - If message.sender_platform_id = client_account.platform_account_id → sender_type = 'user' (message from page/business)
--   - If message.sender_platform_id = conversation.participant_platform_id → sender_type = 'customer' (message from external user)

-- Log current state before migration
DO $$
DECLARE
    total_messages INTEGER;
    user_messages INTEGER;
    customer_messages INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_messages FROM messages;
    SELECT COUNT(*) INTO user_messages FROM messages WHERE sender_type = 'user';
    SELECT COUNT(*) INTO customer_messages FROM messages WHERE sender_type = 'customer';

    RAISE NOTICE '=== BEFORE MIGRATION ===';
    RAISE NOTICE 'Total messages: %', total_messages;
    RAISE NOTICE 'User messages: %', user_messages;
    RAISE NOTICE 'Customer messages: %', customer_messages;
END $$;

-- Update sender_type for messages from the page/business (USER messages)
-- These are messages where the sender is the Instagram business account
WITH page_messages AS (
    SELECT
        m.id,
        m.sender_platform_id,
        ca.platform_account_id as page_id
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    JOIN client_accounts ca ON c.client_account_id = ca.id
    WHERE m.sender_platform_id = ca.platform_account_id
      AND m.sender_type != 'user'  -- Only update if currently wrong
)
UPDATE messages
SET sender_type = 'user'
FROM page_messages pm
WHERE messages.id = pm.id;

-- Log USER messages update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % messages to sender_type = ''user''', updated_count;
END $$;

-- Update sender_type for messages from customers (CUSTOMER messages)
-- These are messages where the sender is the conversation participant (external user)
WITH customer_messages AS (
    SELECT
        m.id,
        m.sender_platform_id,
        c.participant_platform_id
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.sender_platform_id = c.participant_platform_id
      AND m.sender_type != 'customer'  -- Only update if currently wrong
)
UPDATE messages
SET sender_type = 'customer'
FROM customer_messages cm
WHERE messages.id = cm.id;

-- Log CUSTOMER messages update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % messages to sender_type = ''customer''', updated_count;
END $$;

-- Verify: Check for any messages with NULL or invalid sender_platform_id
DO $$
DECLARE
    null_sender_count INTEGER;
    orphan_count INTEGER;
BEGIN
    -- Count messages with NULL sender_platform_id
    SELECT COUNT(*) INTO null_sender_count
    FROM messages
    WHERE sender_platform_id IS NULL;

    -- Count messages where sender doesn't match page OR participant
    SELECT COUNT(*) INTO orphan_count
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    JOIN client_accounts ca ON c.client_account_id = ca.id
    WHERE m.sender_platform_id IS NOT NULL
      AND m.sender_platform_id != ca.platform_account_id
      AND m.sender_platform_id != c.participant_platform_id;

    IF null_sender_count > 0 THEN
        RAISE WARNING 'Found % messages with NULL sender_platform_id - these require manual review', null_sender_count;
    END IF;

    IF orphan_count > 0 THEN
        RAISE WARNING 'Found % messages where sender is neither page nor participant - these require manual review', orphan_count;
    END IF;
END $$;

-- Log final state after migration
DO $$
DECLARE
    total_messages INTEGER;
    user_messages INTEGER;
    customer_messages INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_messages FROM messages;
    SELECT COUNT(*) INTO user_messages FROM messages WHERE sender_type = 'user';
    SELECT COUNT(*) INTO customer_messages FROM messages WHERE sender_type = 'customer';

    RAISE NOTICE '=== AFTER MIGRATION ===';
    RAISE NOTICE 'Total messages: %', total_messages;
    RAISE NOTICE 'User messages: %', user_messages;
    RAISE NOTICE 'Customer messages: %', customer_messages;
END $$;

-- ROLLBACK
-- Note: This migration cannot be safely rolled back automatically because
-- we don't store the original sender_type values. To rollback, you would need
-- to restore from the backup created before running this migration.
