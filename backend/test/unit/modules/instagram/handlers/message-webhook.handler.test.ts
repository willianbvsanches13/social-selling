import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as sinon from 'sinon';
import { MessageWebhookHandler } from '../../../../../src/modules/instagram/handlers/message-webhook.handler';
import { ConversationRepository } from '../../../../../src/infrastructure/database/repositories/conversation.repository';
import { MessageRepository } from '../../../../../src/infrastructure/database/repositories/message.repository';
import { InstagramApiService } from '../../../../../src/modules/instagram/services/instagram-api.service';
import { Conversation } from '../../../../../src/domain/entities/conversation.entity';
import { InstagramProfileDto } from '../../../../../src/modules/instagram/dto/instagram-profile.dto';

interface MessageWebhookHandlerWithPrivate {
  fetchAndUpdateParticipantProfile(
    conversation: Conversation,
    senderId: string,
    clientAccountId: string,
  ): Promise<void>;
}

describe('MessageWebhookHandler', () => {
  let handler: MessageWebhookHandler;
  let conversationRepository: ConversationRepository;
  let instagramApiService: InstagramApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageWebhookHandler,
        {
          provide: ConversationRepository,
          useValue: {
            create: sinon.stub(),
            findByPlatformId: sinon.stub(),
            update: sinon.stub(),
          },
        },
        {
          provide: MessageRepository,
          useValue: {
            create: sinon.stub(),
            findByPlatformId: sinon.stub(),
          },
        },
        {
          provide: InstagramApiService,
          useValue: {
            getUserProfileById: sinon.stub(),
          },
        },
      ],
    }).compile();

    handler = module.get<MessageWebhookHandler>(MessageWebhookHandler);
    conversationRepository = module.get<ConversationRepository>(
      ConversationRepository,
    );
    instagramApiService = module.get<InstagramApiService>(InstagramApiService);

    sinon.stub(Logger.prototype, 'log');
    sinon.stub(Logger.prototype, 'debug');
    sinon.stub(Logger.prototype, 'warn');
    sinon.stub(Logger.prototype, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('fetchAndUpdateParticipantProfile', () => {
    it('should successfully fetch and update participant profile', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'page-123',
        platformConversationId: 'conv-456',
        participantPlatformId: 'sender-789',
        metadata: {},
      });

      const profileData: InstagramProfileDto = {
        id: 'sender-789',
        username: 'john_doe',
        profile_picture_url: 'https://example.com/profile.jpg',
      };

      const getUserProfileByIdStub =
        instagramApiService.getUserProfileById as sinon.SinonStub;
      void getUserProfileByIdStub.resolves(profileData);

      const updateStub = conversationRepository.update as sinon.SinonStub;
      void updateStub.resolves(conversation);

      const handlerWithPrivate =
        handler as unknown as MessageWebhookHandlerWithPrivate;
      await handlerWithPrivate.fetchAndUpdateParticipantProfile(
        conversation,
        'sender-789',
        'page-123',
      );

      sinon.assert.calledOnceWithExactly(
        getUserProfileByIdStub,
        'page-123',
        'sender-789',
      );

      sinon.assert.calledOnce(updateStub);

      const updatedConversation = updateStub.firstCall.args[0] as Conversation;
      expect(updatedConversation.toJSON().participantUsername).toBe('john_doe');
      expect(updatedConversation.toJSON().participantProfilePic).toBe(
        'https://example.com/profile.jpg',
      );
    });

    it('should handle API success scenario and store profile data in conversation', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'page-123',
        platformConversationId: 'conv-456',
        participantPlatformId: 'sender-789',
        metadata: {},
      });

      const profileData: InstagramProfileDto = {
        id: 'sender-789',
        username: 'jane_smith',
        profile_picture_url: 'https://example.com/jane.jpg',
      };

      const getUserProfileByIdStub =
        instagramApiService.getUserProfileById as sinon.SinonStub;
      void getUserProfileByIdStub.resolves(profileData);

      const updateStub = conversationRepository.update as sinon.SinonStub;
      void updateStub.resolves(conversation);

      const handlerWithPrivate =
        handler as unknown as MessageWebhookHandlerWithPrivate;
      await handlerWithPrivate.fetchAndUpdateParticipantProfile(
        conversation,
        'sender-789',
        'page-123',
      );

      sinon.assert.calledOnce(updateStub);
      const savedConversation = updateStub.firstCall.args[0] as Conversation;
      const json = savedConversation.toJSON();

      expect(json.participantUsername).toBe('jane_smith');
      expect(json.participantProfilePic).toBe('https://example.com/jane.jpg');
    });

    it('should handle API failure scenario gracefully without throwing exception', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'page-123',
        platformConversationId: 'conv-456',
        participantPlatformId: 'sender-789',
        metadata: {},
      });

      const getUserProfileByIdStub =
        instagramApiService.getUserProfileById as sinon.SinonStub;
      void getUserProfileByIdStub.resolves(null);

      const updateStub = conversationRepository.update as sinon.SinonStub;

      const handlerWithPrivate =
        handler as unknown as MessageWebhookHandlerWithPrivate;
      await handlerWithPrivate.fetchAndUpdateParticipantProfile(
        conversation,
        'sender-789',
        'page-123',
      );

      sinon.assert.calledOnceWithExactly(
        getUserProfileByIdStub,
        'page-123',
        'sender-789',
      );

      sinon.assert.notCalled(updateStub);
    });

    it('should create conversation without profile when API fails', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'page-123',
        platformConversationId: 'conv-456',
        participantPlatformId: 'sender-789',
        metadata: {},
      });

      const getUserProfileByIdStub =
        instagramApiService.getUserProfileById as sinon.SinonStub;
      void getUserProfileByIdStub.rejects(new Error('API Error'));

      const updateStub = conversationRepository.update as sinon.SinonStub;

      const handlerWithPrivate =
        handler as unknown as MessageWebhookHandlerWithPrivate;
      await handlerWithPrivate.fetchAndUpdateParticipantProfile(
        conversation,
        'sender-789',
        'page-123',
      );

      sinon.assert.calledOnceWithExactly(
        getUserProfileByIdStub,
        'page-123',
        'sender-789',
      );

      sinon.assert.notCalled(updateStub);
    });

    it('should create conversation when profile fetch succeeds', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'page-123',
        platformConversationId: 'conv-456',
        participantPlatformId: 'sender-789',
        metadata: {},
      });

      const cachedProfileData: InstagramProfileDto = {
        id: 'sender-789',
        username: 'cached_user',
        profile_picture_url: 'https://example.com/cached.jpg',
      };

      const getUserProfileByIdStub =
        instagramApiService.getUserProfileById as sinon.SinonStub;
      void getUserProfileByIdStub.resolves(cachedProfileData);

      const updateStub = conversationRepository.update as sinon.SinonStub;
      void updateStub.resolves(conversation);

      const handlerWithPrivate =
        handler as unknown as MessageWebhookHandlerWithPrivate;
      await handlerWithPrivate.fetchAndUpdateParticipantProfile(
        conversation,
        'sender-789',
        'page-123',
      );

      sinon.assert.calledOnceWithExactly(
        getUserProfileByIdStub,
        'page-123',
        'sender-789',
      );

      sinon.assert.calledOnce(updateStub);
      const savedConversation = updateStub.firstCall.args[0] as Conversation;
      const json = savedConversation.toJSON();

      expect(json.participantUsername).toBe('cached_user');
      expect(json.participantProfilePic).toBe('https://example.com/cached.jpg');
    });

    it('should not throw exception when profile update fails', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'page-123',
        platformConversationId: 'conv-456',
        participantPlatformId: 'sender-789',
        metadata: {},
      });

      const profileData: InstagramProfileDto = {
        id: 'sender-789',
        username: 'test_user',
        profile_picture_url: 'https://example.com/test.jpg',
      };

      const getUserProfileByIdStub =
        instagramApiService.getUserProfileById as sinon.SinonStub;
      void getUserProfileByIdStub.resolves(profileData);

      const updateStub = conversationRepository.update as sinon.SinonStub;
      void updateStub.rejects(new Error('Database error'));

      const handlerWithPrivate =
        handler as unknown as MessageWebhookHandlerWithPrivate;
      await handlerWithPrivate.fetchAndUpdateParticipantProfile(
        conversation,
        'sender-789',
        'page-123',
      );

      sinon.assert.calledOnce(getUserProfileByIdStub);
      sinon.assert.calledOnce(updateStub);
    });

    it('should log error when API call fails but not throw', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'page-123',
        platformConversationId: 'conv-456',
        participantPlatformId: 'sender-789',
        metadata: {},
      });

      const apiError = new Error('Instagram API rate limit exceeded');
      const getUserProfileByIdStub =
        instagramApiService.getUserProfileById as sinon.SinonStub;
      void getUserProfileByIdStub.rejects(apiError);

      const handlerWithPrivate =
        handler as unknown as MessageWebhookHandlerWithPrivate;
      await handlerWithPrivate.fetchAndUpdateParticipantProfile(
        conversation,
        'sender-789',
        'page-123',
      );

      sinon.assert.calledOnce(getUserProfileByIdStub);
    });
  });
});
