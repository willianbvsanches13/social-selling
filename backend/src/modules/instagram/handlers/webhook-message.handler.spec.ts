import { Test, TestingModule } from '@nestjs/testing';
import { WebhookMessageHandler } from './webhook-message.handler';
import { IConversationRepository } from '../../../domain/repositories/conversation.repository.interface';
import { IMessageRepository } from '../../../domain/repositories/message.repository.interface';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import { ConversationService } from '../../messaging/services/conversation.service';
import { InstagramWebhookEvent } from '../../../domain/entities/instagram-webhook-event.entity';
import { Conversation } from '../../../domain/entities/conversation.entity';
import { Message } from '../../../domain/entities/message.entity';

describe('WebhookMessageHandler - Integration Tests', () => {
  let handler: WebhookMessageHandler;
  let conversationRepository: jest.Mocked<IConversationRepository>;
  let messageRepository: jest.Mocked<IMessageRepository>;
  let clientAccountRepository: jest.Mocked<IClientAccountRepository>;
  let conversationService: jest.Mocked<ConversationService>;

  const mockClientAccount = {
    id: 'client-123',
    platformAccountId: 'instagram-page-789',
    userId: 'user-456',
  };

  const mockConversation = {
    id: 'conv-123',
    participantPlatformId: 'instagram-user-456',
    participantUsername: null,
    participantProfilePic: null,
    incrementUnreadCount: jest.fn(),
    updateLastMessage: jest.fn(),
  };

  const mockWebhookEvent: InstagramWebhookEvent = {
    id: 'event-123',
    clientAccountId: 'client-123',
    eventType: 'messages',
    payload: {
      entry: [
        {
          id: 'instagram-page-789',
          messaging: [
            {
              sender: { id: 'instagram-user-456' },
              recipient: { id: 'instagram-page-789' },
              timestamp: 1635724800000,
              message: {
                mid: 'msg-123',
                text: 'Hello, I need help!',
              },
            },
          ],
        },
      ],
    },
    receivedAt: new Date(),
    processedAt: null,
    status: 'pending',
  } as any;

  beforeEach(async () => {
    const mockConversationRepository = {
      findById: jest.fn(),
      findByPlatformId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockMessageRepository = {
      create: jest.fn(),
    };

    const mockClientAccountRepository = {
      findById: jest.fn(),
    };

    const mockConversationService = {
      enrichParticipantProfile: jest.fn(),
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
        {
          provide: ConversationService,
          useValue: mockConversationService,
        },
      ],
    }).compile();

    handler = module.get<WebhookMessageHandler>(WebhookMessageHandler);
    conversationRepository = module.get('IConversationRepository');
    messageRepository = module.get('IMessageRepository');
    clientAccountRepository = module.get('IClientAccountRepository');
    conversationService = module.get(ConversationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessageEvent - Webhook to Enrichment Flow', () => {
    it('should process message and trigger enrichment for new conversation without profile', async () => {
      // Arrange
      clientAccountRepository.findById.mockResolvedValue(
        mockClientAccount as any,
      );
      conversationRepository.findByPlatformId.mockResolvedValue(null);
      conversationRepository.create.mockResolvedValue(
        mockConversation as any,
      );
      conversationRepository.update.mockResolvedValue(
        mockConversation as any,
      );
      messageRepository.create.mockResolvedValue({} as any);
      conversationService.enrichParticipantProfile.mockResolvedValue({
        enriched: true,
      });

      // Act
      await handler.processMessageEvent(
        mockWebhookEvent,
        mockClientAccount.id,
      );

      // Give enrichment promise time to resolve (since it's fire-and-forget)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Verify message was created
      expect(messageRepository.create).toHaveBeenCalled();
      const createdMessage = messageRepository.create.mock.calls[0][0];
      expect(createdMessage.content).toBe('Hello, I need help!');

      // Assert - Verify conversation was created
      expect(conversationRepository.create).toHaveBeenCalled();

      // Assert - Verify enrichment was triggered
      expect(conversationService.enrichParticipantProfile).toHaveBeenCalledWith(
        mockConversation.id,
        mockClientAccount.id,
      );

      // Assert - Verify conversation updates
      expect(mockConversation.incrementUnreadCount).toHaveBeenCalled();
      expect(mockConversation.updateLastMessage).toHaveBeenCalled();
    });

    it('should process message and trigger enrichment for existing conversation without profile', async () => {
      // Arrange
      clientAccountRepository.findById.mockResolvedValue(
        mockClientAccount as any,
      );
      conversationRepository.findByPlatformId.mockResolvedValue(
        mockConversation as any,
      );
      conversationRepository.update.mockResolvedValue(
        mockConversation as any,
      );
      messageRepository.create.mockResolvedValue({} as any);
      conversationService.enrichParticipantProfile.mockResolvedValue({
        enriched: true,
      });

      // Act
      await handler.processMessageEvent(
        mockWebhookEvent,
        mockClientAccount.id,
      );

      // Give enrichment promise time to resolve
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert
      expect(conversationService.enrichParticipantProfile).toHaveBeenCalledWith(
        mockConversation.id,
        mockClientAccount.id,
      );
    });

    it('should skip enrichment if conversation already has profile data', async () => {
      // Arrange
      const enrichedConversation = {
        ...mockConversation,
        participantUsername: 'test_user',
        participantProfilePic: 'https://instagram.com/profile/test_user.jpg',
      };
      clientAccountRepository.findById.mockResolvedValue(
        mockClientAccount as any,
      );
      conversationRepository.findByPlatformId.mockResolvedValue(
        enrichedConversation as any,
      );
      conversationRepository.update.mockResolvedValue(
        enrichedConversation as any,
      );
      messageRepository.create.mockResolvedValue({} as any);

      // Act
      await handler.processMessageEvent(
        mockWebhookEvent,
        mockClientAccount.id,
      );

      // Give time for any async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Enrichment should not be triggered
      expect(
        conversationService.enrichParticipantProfile,
      ).not.toHaveBeenCalled();
    });

    it('should continue message processing even if enrichment fails', async () => {
      // Arrange
      clientAccountRepository.findById.mockResolvedValue(
        mockClientAccount as any,
      );
      conversationRepository.findByPlatformId.mockResolvedValue(
        mockConversation as any,
      );
      conversationRepository.update.mockResolvedValue(
        mockConversation as any,
      );
      messageRepository.create.mockResolvedValue({} as any);
      conversationService.enrichParticipantProfile.mockResolvedValue({
        enriched: false,
        error: 'Instagram API rate limit exceeded',
      });

      // Act
      await handler.processMessageEvent(
        mockWebhookEvent,
        mockClientAccount.id,
      );

      // Give enrichment promise time to resolve
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Message should still be created despite enrichment failure
      expect(messageRepository.create).toHaveBeenCalled();
      expect(conversationRepository.update).toHaveBeenCalled();
      expect(conversationService.enrichParticipantProfile).toHaveBeenCalled();
    });

    it('should handle enrichment promise rejection gracefully', async () => {
      // Arrange
      clientAccountRepository.findById.mockResolvedValue(
        mockClientAccount as any,
      );
      conversationRepository.findByPlatformId.mockResolvedValue(
        mockConversation as any,
      );
      conversationRepository.update.mockResolvedValue(
        mockConversation as any,
      );
      messageRepository.create.mockResolvedValue({} as any);
      conversationService.enrichParticipantProfile.mockRejectedValue(
        new Error('Unexpected error in enrichment'),
      );

      // Act & Assert - Should not throw
      await expect(
        handler.processMessageEvent(mockWebhookEvent, mockClientAccount.id),
      ).resolves.not.toThrow();

      // Give enrichment promise time to reject
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Message should still be processed
      expect(messageRepository.create).toHaveBeenCalled();
    });

    it('should not trigger enrichment for outgoing messages (from page)', async () => {
      // Arrange - Message sent BY the page (not received)
      const outgoingMessageEvent: InstagramWebhookEvent = {
        ...mockWebhookEvent,
        payload: {
          entry: [
            {
              id: 'instagram-page-789',
              messaging: [
                {
                  sender: { id: 'instagram-page-789' }, // Page is sender
                  recipient: { id: 'instagram-user-456' },
                  timestamp: 1635724800000,
                  message: {
                    mid: 'msg-456',
                    text: 'Thanks for contacting us!',
                  },
                },
              ],
            },
          ],
        },
      } as any;

      clientAccountRepository.findById.mockResolvedValue(
        mockClientAccount as any,
      );
      conversationRepository.findByPlatformId.mockResolvedValue(
        mockConversation as any,
      );
      conversationRepository.update.mockResolvedValue(
        mockConversation as any,
      );
      messageRepository.create.mockResolvedValue({} as any);

      // Act
      await handler.processMessageEvent(
        outgoingMessageEvent,
        mockClientAccount.id,
      );

      // Give time for any async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Assert - Enrichment should still be triggered (conversation needs profile regardless of message direction)
      expect(conversationService.enrichParticipantProfile).toHaveBeenCalled();
    });

    it('should handle missing client account gracefully', async () => {
      // Arrange
      clientAccountRepository.findById.mockResolvedValue(null);

      // Act & Assert - Should not throw, but also not process message
      await expect(
        handler.processMessageEvent(mockWebhookEvent, mockClientAccount.id),
      ).resolves.not.toThrow();

      // Assert - No message or enrichment should be triggered
      expect(messageRepository.create).not.toHaveBeenCalled();
      expect(
        conversationService.enrichParticipantProfile,
      ).not.toHaveBeenCalled();
    });

    it('should properly extract participant platform ID from webhook payload', async () => {
      // Arrange
      clientAccountRepository.findById.mockResolvedValue(
        mockClientAccount as any,
      );
      conversationRepository.findByPlatformId.mockResolvedValue(null);
      conversationRepository.create.mockResolvedValue(
        mockConversation as any,
      );
      conversationRepository.update.mockResolvedValue(
        mockConversation as any,
      );
      messageRepository.create.mockResolvedValue({} as any);
      conversationService.enrichParticipantProfile.mockResolvedValue({
        enriched: true,
      });

      // Act
      await handler.processMessageEvent(
        mockWebhookEvent,
        mockClientAccount.id,
      );

      // Assert - Verify conversation was created with correct participant platform ID
      expect(conversationRepository.findByPlatformId).toHaveBeenCalledWith(
        mockClientAccount.id,
        `${mockClientAccount.platformAccountId}_instagram-user-456`,
      );
    });
  });
});
