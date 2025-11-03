import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { WebhookMessageHandler } from '../../../../../src/modules/instagram/handlers/webhook-message.handler';
import { IConversationRepository } from '../../../../../src/domain/repositories/conversation.repository.interface';
import { IMessageRepository } from '../../../../../src/domain/repositories/message.repository.interface';
import { IClientAccountRepository } from '../../../../../src/domain/repositories/client-account.repository.interface';
import { InstagramWebhookEvent } from '../../../../../src/domain/entities/instagram-webhook-event.entity';
import { ClientAccount } from '../../../../../src/domain/entities/client-account.entity';
import { Conversation } from '../../../../../src/domain/entities/conversation.entity';
import { Message, SenderType } from '../../../../../src/domain/entities/message.entity';

describe('WebhookMessageHandler', () => {
  let handler: WebhookMessageHandler;
  let conversationRepository: jest.Mocked<IConversationRepository>;
  let messageRepository: jest.Mocked<IMessageRepository>;
  let clientAccountRepository: jest.Mocked<IClientAccountRepository>;

  beforeEach(async () => {
    const mockConversationRepository = {
      create: jest.fn(),
      findByPlatformId: jest.fn(),
      update: jest.fn(),
    };

    const mockMessageRepository = {
      create: jest.fn(),
    };

    const mockClientAccountRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookMessageHandler,
        {
          provide: 'IConversationRepository',
          useValue: mockConversationRepository,
        },
        {
          provide: 'IMessageRepository',
          useValue: mockMessageRepository,
        },
        {
          provide: 'IClientAccountRepository',
          useValue: mockClientAccountRepository,
        },
      ],
    }).compile();

    handler = module.get<WebhookMessageHandler>(WebhookMessageHandler);
    conversationRepository = module.get('IConversationRepository');
    messageRepository = module.get('IMessageRepository');
    clientAccountRepository = module.get('IClientAccountRepository');

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processMessageEvent - customer message (received)', () => {
    it('should correctly identify customer message when sender.id !== entry.id', async () => {
      const entryId = '17841403506636395'; // Page ID
      const customerId = '1132642475702268'; // Customer ID (different from entry.id)
      const clientAccountId = 'client-123';

      const webhookEvent: InstagramWebhookEvent = {
        id: 'event-123',
        eventType: 'messages',
        payload: {
          entry: [
            {
              id: entryId,
              time: 1761948183948,
              messaging: [
                {
                  sender: { id: customerId },
                  recipient: { id: entryId },
                  timestamp: 1761948183080,
                  message: {
                    mid: 'msg-123',
                    text: 'Hello from customer',
                  },
                },
              ],
            },
          ],
          object: 'instagram',
        },
      } as any;

      const clientAccount = {
        id: clientAccountId,
        platformAccountId: entryId,
      } as ClientAccount;

      const conversation = Conversation.create({
        clientAccountId,
        platformConversationId: `${clientAccountId}_${customerId}`,
        participantPlatformId: customerId,
        metadata: {},
      });

      clientAccountRepository.findById.mockResolvedValue(clientAccount);
      conversationRepository.findByPlatformId.mockResolvedValue(null);
      conversationRepository.create.mockResolvedValue(conversation);
      conversationRepository.update.mockResolvedValue(conversation);
      messageRepository.create.mockResolvedValue({} as Message);

      await handler.processMessageEvent(webhookEvent, clientAccountId);

      // Verify conversation was created with correct participant (customer)
      expect(conversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          participantPlatformId: customerId,
        }),
      );

      // Verify message was created with CUSTOMER sender type
      const createdMessage = messageRepository.create.mock.calls[0][0];
      const messageJson = createdMessage.toJSON();
      expect(messageJson.senderType).toBe(SenderType.CUSTOMER);
      expect(messageJson.senderPlatformId).toBe(customerId);

      // Verify unread count was incremented
      expect(conversationRepository.update).toHaveBeenCalled();
    });
  });

  describe('processMessageEvent - user message (sent)', () => {
    it('should correctly identify user message when sender.id === entry.id', async () => {
      const entryId = '17841403506636395'; // Page ID
      const recipientId = '1132642475702268'; // Recipient ID (customer)
      const clientAccountId = 'client-123';

      const webhookEvent: InstagramWebhookEvent = {
        id: 'event-456',
        eventType: 'messages',
        payload: {
          entry: [
            {
              id: entryId,
              time: 1761948183948,
              messaging: [
                {
                  sender: { id: entryId }, // Sender is the page (same as entry.id)
                  recipient: { id: recipientId },
                  timestamp: 1761948183080,
                  message: {
                    mid: 'msg-456',
                    text: 'Hello from user',
                  },
                },
              ],
            },
          ],
          object: 'instagram',
        },
      } as any;

      const clientAccount = {
        id: clientAccountId,
        platformAccountId: entryId,
      } as ClientAccount;

      const conversation = Conversation.create({
        clientAccountId,
        platformConversationId: `${clientAccountId}_${recipientId}`,
        participantPlatformId: recipientId,
        metadata: {},
      });

      clientAccountRepository.findById.mockResolvedValue(clientAccount);
      conversationRepository.findByPlatformId.mockResolvedValue(null);
      conversationRepository.create.mockResolvedValue(conversation);
      conversationRepository.update.mockResolvedValue(conversation);
      messageRepository.create.mockResolvedValue({} as Message);

      await handler.processMessageEvent(webhookEvent, clientAccountId);

      // Verify conversation was created with correct participant (recipient)
      expect(conversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          participantPlatformId: recipientId,
        }),
      );

      // Verify message was created with USER sender type
      const createdMessage = messageRepository.create.mock.calls[0][0];
      const messageJson = createdMessage.toJSON();
      expect(messageJson.senderType).toBe(SenderType.USER);
      expect(messageJson.senderPlatformId).toBe(entryId);

      // Verify unread count was NOT incremented (sent by user)
      expect(conversation.toJSON().unreadCount).toBe(0);
    });
  });

  describe('processMessageEvent - echo messages', () => {
    it('should skip echo messages', async () => {
      const entryId = '17841403506636395';
      const clientAccountId = 'client-123';

      const webhookEvent: InstagramWebhookEvent = {
        id: 'event-789',
        eventType: 'messages',
        payload: {
          entry: [
            {
              id: entryId,
              time: 1761948183948,
              messaging: [
                {
                  sender: { id: entryId },
                  recipient: { id: '1132642475702268' },
                  timestamp: 1761948183080,
                  message: {
                    mid: 'msg-789',
                    text: 'Echo message',
                    is_echo: true,
                  },
                },
              ],
            },
          ],
          object: 'instagram',
        },
      } as any;

      const clientAccount = {
        id: clientAccountId,
        platformAccountId: entryId,
      } as ClientAccount;

      clientAccountRepository.findById.mockResolvedValue(clientAccount);

      await handler.processMessageEvent(webhookEvent, clientAccountId);

      // Verify no message was created
      expect(messageRepository.create).not.toHaveBeenCalled();
      expect(conversationRepository.create).not.toHaveBeenCalled();
    });
  });
});
