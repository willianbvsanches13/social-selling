-- Seed data for Instagram messaging feature
-- This seed creates conversations and messages based on real Instagram webhook examples

DO $$
DECLARE
  v_user_id UUID;
  v_account_id UUID;
  v_conv1_id UUID;
  v_conv2_id UUID;
  v_conv3_id UUID;
BEGIN
  -- Create or get test user
  INSERT INTO users (email, name, password_hash, created_at, updated_at)
  VALUES (
    'test_messaging@example.com',
    'Test Messaging User',
    '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_user_id FROM users WHERE email = 'test_messaging@example.com';

  -- Create or get Instagram account
  INSERT INTO client_accounts (
    user_id,
    platform,
    platform_account_id,
    username,
    account_type,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    'instagram',
    '17841403506636395',
    'mybusiness',
    'business',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_account_id FROM client_accounts
  WHERE platform = 'instagram' AND platform_account_id = '17841403506636395' AND deleted_at IS NULL;

  -- Create conversations
  INSERT INTO conversations (
    client_account_id,
    platform_conversation_id,
    participant_platform_id,
    participant_username,
    participant_profile_pic,
    last_message_at,
    unread_count,
    status,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    v_account_id,
    'ig_conv_1378516947077414',
    '1378516947077414',
    'user1',
    'https://i.pravatar.cc/150?img=1',
    '2025-10-31 15:30:50+00',
    1,
    'open',
    '{"source": "instagram_webhook", "test": true}',
    '2025-10-31 14:15:03+00',
    '2025-10-31 15:30:50+00'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_conv1_id;

  IF v_conv1_id IS NULL THEN
    SELECT id INTO v_conv1_id FROM conversations
    WHERE platform_conversation_id = 'ig_conv_1378516947077414' AND client_account_id = v_account_id;
  END IF;

  INSERT INTO conversations (
    client_account_id,
    platform_conversation_id,
    participant_platform_id,
    participant_username,
    participant_profile_pic,
    last_message_at,
    unread_count,
    status,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    v_account_id,
    'ig_conv_2149642518895477',
    '2149642518895477',
    'user2',
    'https://i.pravatar.cc/150?img=2',
    '2025-10-31 11:52:00+00',
    2,
    'open',
    '{"source": "instagram_webhook", "test": true}',
    '2025-10-31 11:51:16+00',
    '2025-10-31 11:52:00+00'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_conv2_id;

  IF v_conv2_id IS NULL THEN
    SELECT id INTO v_conv2_id FROM conversations
    WHERE platform_conversation_id = 'ig_conv_2149642518895477' AND client_account_id = v_account_id;
  END IF;

  INSERT INTO conversations (
    client_account_id,
    platform_conversation_id,
    participant_platform_id,
    participant_username,
    participant_profile_pic,
    last_message_at,
    unread_count,
    status,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    v_account_id,
    'ig_conv_3456789012345678',
    '3456789012345678',
    'user3',
    'https://i.pravatar.cc/150?img=3',
    '2025-10-31 12:23:30+00',
    2,
    'open',
    '{"source": "instagram_webhook", "test": true}',
    '2025-10-31 12:23:20+00',
    '2025-10-31 12:23:30+00'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_conv3_id;

  IF v_conv3_id IS NULL THEN
    SELECT id INTO v_conv3_id FROM conversations
    WHERE platform_conversation_id = 'ig_conv_3456789012345678' AND client_account_id = v_account_id;
  END IF;

  -- Insert messages
  INSERT INTO messages (conversation_id, platform_message_id, sender_type, sender_platform_id, message_type, content, is_read, sent_at, metadata, created_at)
  VALUES (v_conv1_id, 'msg_001_test', 'customer', '1378516947077414', 'text', 'Oi! Gostaria de saber mais sobre os produtos', false, '2025-10-31 14:15:03+00', '{"webhook_time": 1761939354463}', '2025-10-31 14:15:03+00')
  ON CONFLICT (platform_message_id) DO NOTHING;

  INSERT INTO messages (conversation_id, platform_message_id, sender_type, sender_platform_id, message_type, content, is_read, sent_at, metadata, created_at)
  VALUES (v_conv2_id, 'msg_002_test', 'customer', '2149642518895477', 'text', 'Olá, vi seu post no Instagram e me interessei', false, '2025-10-31 11:51:16+00', '{"webhook_time": 1761939378473}', '2025-10-31 11:51:16+00')
  ON CONFLICT (platform_message_id) DO NOTHING;

  INSERT INTO messages (conversation_id, platform_message_id, sender_type, sender_platform_id, message_type, content, is_read, sent_at, metadata, created_at)
  VALUES (v_conv2_id, 'msg_003_test', 'customer', '2149642518895477', 'text', 'Vocês fazem entrega para São Paulo?', false, '2025-10-31 11:51:21+00', '{"webhook_time": 1761939378689}', '2025-10-31 11:51:21+00')
  ON CONFLICT (platform_message_id) DO NOTHING;

  INSERT INTO messages (conversation_id, platform_message_id, sender_type, sender_platform_id, message_type, content, is_read, sent_at, delivered_at, metadata, created_at)
  VALUES (v_conv2_id, 'msg_004_test', 'user', '17841403506636395', 'text', 'Sim, fazemos entrega em toda região metropolitana!', true, '2025-10-31 11:51:49+00', '2025-10-31 11:51:49+00', '{"webhook_time": 1761939379134, "is_echo": true}', '2025-10-31 11:51:49+00')
  ON CONFLICT (platform_message_id) DO NOTHING;

  INSERT INTO messages (conversation_id, platform_message_id, sender_type, sender_platform_id, message_type, content, is_read, sent_at, metadata, created_at)
  VALUES (v_conv2_id, 'msg_005_test', 'customer', '2149642518895477', 'text', 'Perfeito! Qual o prazo de entrega?', false, '2025-10-31 11:52:00+00', '{"webhook_time": 1761939380000}', '2025-10-31 11:52:00+00')
  ON CONFLICT (platform_message_id) DO NOTHING;

  INSERT INTO messages (conversation_id, platform_message_id, sender_type, sender_platform_id, message_type, content, is_read, sent_at, metadata, created_at)
  VALUES (v_conv1_id, 'msg_006_test', 'customer', '1378516947077414', 'text', 'Vocês aceitam cartão de crédito?', false, '2025-10-31 15:30:50+00', '{"webhook_time": 1761939385000}', '2025-10-31 15:30:50+00')
  ON CONFLICT (platform_message_id) DO NOTHING;

  INSERT INTO messages (conversation_id, platform_message_id, sender_type, sender_platform_id, message_type, content, is_read, sent_at, metadata, created_at)
  VALUES (v_conv3_id, 'msg_007_test', 'customer', '3456789012345678', 'text', 'Boa tarde! Vocês têm estoque disponível?', false, '2025-10-31 12:23:20+00', '{"webhook_time": 1761939390000}', '2025-10-31 12:23:20+00')
  ON CONFLICT (platform_message_id) DO NOTHING;

  INSERT INTO messages (conversation_id, platform_message_id, sender_type, sender_platform_id, message_type, content, is_read, sent_at, metadata, created_at)
  VALUES (v_conv3_id, 'msg_008_test', 'customer', '3456789012345678', 'text', 'Adorei os produtos! 😍🛍️', false, '2025-10-31 12:23:30+00', '{"webhook_time": 1761939395000}', '2025-10-31 12:23:30+00')
  ON CONFLICT (platform_message_id) DO NOTHING;

END $$;

-- Summary: Seed completed successfully!
-- Run this query manually to check results:
-- SELECT
--   'Seed completed successfully!' as status,
--   (SELECT COUNT(*) FROM conversations WHERE metadata->>'test' = 'true') as conversations_created,
--   (SELECT COUNT(*) FROM messages WHERE metadata->>'webhook_time' IS NOT NULL) as messages_created;
