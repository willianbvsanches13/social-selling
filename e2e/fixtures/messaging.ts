import { Page } from '@playwright/test';
import type {
  Conversation,
  Message,
  ConversationListResponse,
  MessageListResponse,
} from '../../frontend/src/types/message';

/**
 * Mock conversations data for testing
 */
export const mockConversations: Conversation[] = [
  {
    id: '00000000-0000-0000-0000-000000000100',
    clientAccountId: '00000000-0000-0000-0000-000000000010',
    platformConversationId: 'ig_conv_1378516947077414',
    participantPlatformId: '1378516947077414',
    participantUsername: 'user1',
    participantProfilePic: 'https://i.pravatar.cc/150?img=1',
    lastMessageAt: '2025-10-31T15:30:50.000Z',
    unreadCount: 1,
    status: 'active',
    metadata: { source: 'instagram_webhook', test: true },
    createdAt: '2025-10-31T14:15:03.000Z',
    updatedAt: '2025-10-31T15:30:50.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000101',
    clientAccountId: '00000000-0000-0000-0000-000000000010',
    platformConversationId: 'ig_conv_2149642518895477',
    participantPlatformId: '2149642518895477',
    participantUsername: 'user2',
    participantProfilePic: 'https://i.pravatar.cc/150?img=2',
    lastMessageAt: '2025-10-31T11:52:00.000Z',
    unreadCount: 2,
    status: 'active',
    metadata: { source: 'instagram_webhook', test: true },
    createdAt: '2025-10-31T11:51:16.000Z',
    updatedAt: '2025-10-31T11:52:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    clientAccountId: '00000000-0000-0000-0000-000000000010',
    platformConversationId: 'ig_conv_3456789012345678',
    participantPlatformId: '3456789012345678',
    participantUsername: 'user3',
    participantProfilePic: 'https://i.pravatar.cc/150?img=3',
    lastMessageAt: '2025-10-31T12:23:30.000Z',
    unreadCount: 2,
    status: 'active',
    metadata: { source: 'instagram_webhook', test: true },
    createdAt: '2025-10-31T12:23:20.000Z',
    updatedAt: '2025-10-31T12:23:30.000Z',
  },
];

/**
 * Mock messages for conversation with user1
 */
export const mockMessagesUser1: Message[] = [
  {
    id: '00000000-0000-0000-0000-000000001001',
    conversationId: '00000000-0000-0000-0000-000000000100',
    platformMessageId: 'msg_001',
    senderType: 'customer',
    senderPlatformId: '1378516947077414',
    messageType: 'text',
    content: 'Oi! Gostaria de saber mais sobre os produtos',
    isRead: false,
    sentAt: '2025-10-31T14:15:03.000Z',
    metadata: { webhook_time: 1761939354463 },
    createdAt: '2025-10-31T14:15:03.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000001006',
    conversationId: '00000000-0000-0000-0000-000000000100',
    platformMessageId: 'msg_006',
    senderType: 'customer',
    senderPlatformId: '1378516947077414',
    messageType: 'text',
    content: 'Vocês aceitam cartão de crédito?',
    isRead: false,
    sentAt: '2025-10-31T15:30:50.000Z',
    metadata: { webhook_time: 1761939385000 },
    createdAt: '2025-10-31T15:30:50.000Z',
  },
];

/**
 * Mock messages for conversation with user2
 */
export const mockMessagesUser2: Message[] = [
  {
    id: '00000000-0000-0000-0000-000000001002',
    conversationId: '00000000-0000-0000-0000-000000000101',
    platformMessageId: 'msg_002',
    senderType: 'customer',
    senderPlatformId: '2149642518895477',
    messageType: 'text',
    content: 'Olá, vi seu post no Instagram e me interessei',
    isRead: false,
    sentAt: '2025-10-31T11:51:16.000Z',
    metadata: { webhook_time: 1761939378473 },
    createdAt: '2025-10-31T11:51:16.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000001003',
    conversationId: '00000000-0000-0000-0000-000000000101',
    platformMessageId: 'msg_003',
    senderType: 'customer',
    senderPlatformId: '2149642518895477',
    messageType: 'text',
    content: 'Vocês fazem entrega para São Paulo?',
    isRead: false,
    sentAt: '2025-10-31T11:51:21.000Z',
    metadata: { webhook_time: 1761939378689 },
    createdAt: '2025-10-31T11:51:21.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000001004',
    conversationId: '00000000-0000-0000-0000-000000000101',
    platformMessageId: 'msg_004',
    senderType: 'user',
    senderPlatformId: '17841403506636395',
    messageType: 'text',
    content: 'Sim, fazemos entrega em toda região metropolitana!',
    isRead: true,
    sentAt: '2025-10-31T11:51:49.000Z',
    deliveredAt: '2025-10-31T11:51:49.000Z',
    metadata: { webhook_time: 1761939379134, is_echo: true },
    createdAt: '2025-10-31T11:51:49.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000001005',
    conversationId: '00000000-0000-0000-0000-000000000101',
    platformMessageId: 'msg_005',
    senderType: 'customer',
    senderPlatformId: '2149642518895477',
    messageType: 'text',
    content: 'Perfeito! Qual o prazo de entrega?',
    isRead: false,
    sentAt: '2025-10-31T11:52:00.000Z',
    metadata: { webhook_time: 1761939380000 },
    createdAt: '2025-10-31T11:52:00.000Z',
  },
];

/**
 * Mock Instagram webhook payload
 */
export const mockInstagramWebhook = {
  entry: [
    {
      id: '17841403506636395',
      time: Date.now(),
      messaging: [
        {
          sender: { id: '1378516947077414' },
          message: {
            mid: 'msg_new_test',
            text: 'Nova mensagem de teste via webhook',
          },
          recipient: { id: '17841403506636395' },
          timestamp: Date.now() - 1000,
        },
      ],
    },
  ],
  object: 'instagram',
};

/**
 * Mock API routes for messaging
 */
export async function mockMessagingRoutes(page: Page): Promise<void> {
  // Mock conversations list
  await page.route('**/api/messaging/conversations**', async (route) => {
    const url = new URL(route.request().url());
    const hasUnread = url.searchParams.get('hasUnread');

    let conversations = mockConversations;
    if (hasUnread === 'true') {
      conversations = conversations.filter((c) => c.unreadCount > 0);
    }

    const response: ConversationListResponse = {
      conversations,
      total: conversations.length,
      limit: 20,
      offset: 0,
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: response }),
    });
  });

  // Mock conversation detail
  await page.route('**/api/messaging/conversations/*', async (route) => {
    if (route.request().method() === 'GET') {
      const conversationId = route.request().url().split('/').pop()?.split('?')[0];
      const conversation = mockConversations.find((c) => c.id === conversationId);

      if (!conversation) {
        await route.fulfill({ status: 404 });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: conversation }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock messages list
  await page.route('**/api/messaging/conversations/*/messages**', async (route) => {
    const conversationId = route.request().url().split('/')[6];
    let messages: Message[] = [];

    if (conversationId === '00000000-0000-0000-0000-000000000100') {
      messages = mockMessagesUser1;
    } else if (conversationId === '00000000-0000-0000-0000-000000000101') {
      messages = mockMessagesUser2;
    }

    const response: MessageListResponse = {
      messages,
      total: messages.length,
      limit: 50,
      offset: 0,
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: response }),
    });
  });

  // Mock send message
  await page.route('**/api/messaging/conversations/*/send', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const conversationId = route.request().url().split('/')[6];

      const newMessage: Message = {
        id: `new-msg-${Date.now()}`,
        conversationId,
        platformMessageId: `platform-msg-${Date.now()}`,
        senderType: 'user',
        messageType: 'text',
        content: body.text,
        isRead: false,
        sentAt: new Date().toISOString(),
        metadata: {},
        createdAt: new Date().toISOString(),
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newMessage }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock mark as read
  await page.route('**/api/messaging/conversations/*/read', async (route) => {
    if (route.request().method() === 'PATCH') {
      const conversationId = route.request().url().split('/')[6];
      const conversation = mockConversations.find((c) => c.id === conversationId);

      if (!conversation) {
        await route.fulfill({ status: 404 });
        return;
      }

      const updatedConversation = { ...conversation, unreadCount: 0 };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: updatedConversation }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock Instagram account
 */
export async function mockInstagramAccount(page: Page): Promise<void> {
  await page.route('**/api/instagram/accounts**', async (route) => {
    const accounts = [
      {
        id: '00000000-0000-0000-0000-000000000010',
        platformAccountId: '17841403506636395',
        username: 'mybusiness',
        platform: 'instagram',
        isActive: true,
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: accounts }),
    });
  });
}
