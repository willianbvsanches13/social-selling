import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { IConversationRepository } from '../../../domain/repositories/conversation.repository.interface';
import { IMessageRepository } from '../../../domain/repositories/message.repository.interface';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import { InstagramApiService } from '../../instagram/services/instagram-api.service';
import { Conversation } from '../../../domain/entities/conversation.entity';
import { InstagramProfileDto } from '../../instagram/dto/instagram-profile.dto';

describe('ConversationService', () => {
  let service: ConversationService;
  let conversationRepository: jest.Mocked<IConversationRepository>;
  let messageRepository: jest.Mocked<IMessageRepository>;
  let clientAccountRepository: jest.Mocked<IClientAccountRepository>;
  let instagramApiService: jest.Mocked<InstagramApiService>;

  const mockConversation = {
    id: 'conv-123',
    participantPlatformId: 'instagram-user-456',
    participantUsername: null,
    participantProfilePic: null,
    updateParticipantProfile: jest.fn(),
  };

  const mockProfile: InstagramProfileDto = {
    id: 'instagram-user-456',
    username: 'test_user',
    profile_picture_url: 'https://instagram.com/profile/test_user.jpg',
  };

  beforeEach(async () => {
    const mockConversationRepository = {
      findById: jest.fn(),
      findByPlatformId: jest.fn(),
      findByClientAccount: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockMessageRepository = {
      findById: jest.fn(),
      findByConversation: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      markAllAsReadByConversation: jest.fn(),
    };

    const mockClientAccountRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockInstagramApiService = {
      getUserProfileById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
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
          provide: InstagramApiService,
          useValue: mockInstagramApiService,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    conversationRepository = module.get('IConversationRepository');
    messageRepository = module.get('IMessageRepository');
    clientAccountRepository = module.get('IClientAccountRepository');
    instagramApiService = module.get(InstagramApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichParticipantProfile', () => {
    const conversationId = 'conv-123';
    const accountId = 'account-456';

    it('should successfully enrich conversation with participant profile', async () => {
      // Arrange
      conversationRepository.findById.mockResolvedValue(
        mockConversation as any,
      );
      instagramApiService.getUserProfileById.mockResolvedValue(mockProfile);
      conversationRepository.update.mockResolvedValue(mockConversation as any);

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(true);
      expect(result.error).toBeUndefined();
      expect(conversationRepository.findById).toHaveBeenCalledWith(
        conversationId,
      );
      expect(instagramApiService.getUserProfileById).toHaveBeenCalledWith(
        accountId,
        mockConversation.participantPlatformId,
      );
      expect(mockConversation.updateParticipantProfile).toHaveBeenCalledWith(
        mockProfile.username,
        mockProfile.profile_picture_url,
      );
      expect(conversationRepository.update).toHaveBeenCalledWith(
        mockConversation,
      );
    });

    it('should return error when conversation is not found', async () => {
      // Arrange
      conversationRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Conversation not found');
      expect(instagramApiService.getUserProfileById).not.toHaveBeenCalled();
      expect(conversationRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when participantPlatformId is missing', async () => {
      // Arrange
      const conversationWithoutPlatformId = {
        ...mockConversation,
        participantPlatformId: null,
      };
      conversationRepository.findById.mockResolvedValue(
        conversationWithoutPlatformId as any,
      );

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Missing participant platform ID');
      expect(instagramApiService.getUserProfileById).not.toHaveBeenCalled();
    });

    it('should skip enrichment if conversation already has profile data', async () => {
      // Arrange
      const enrichedConversation = {
        ...mockConversation,
        participantUsername: 'existing_user',
        participantProfilePic: 'https://instagram.com/existing.jpg',
      };
      conversationRepository.findById.mockResolvedValue(
        enrichedConversation as any,
      );

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Already enriched');
      expect(instagramApiService.getUserProfileById).not.toHaveBeenCalled();
    });

    it('should return error when Instagram API returns null profile', async () => {
      // Arrange
      conversationRepository.findById.mockResolvedValue(
        mockConversation as any,
      );
      instagramApiService.getUserProfileById.mockResolvedValue(null);

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Profile not found in Instagram API');
      expect(mockConversation.updateParticipantProfile).not.toHaveBeenCalled();
      expect(conversationRepository.update).not.toHaveBeenCalled();
    });

    it('should return error when profile data is incomplete (missing username)', async () => {
      // Arrange
      const incompleteProfile = {
        ...mockProfile,
        username: '',
      };
      conversationRepository.findById.mockResolvedValue(
        mockConversation as any,
      );
      instagramApiService.getUserProfileById.mockResolvedValue(
        incompleteProfile,
      );

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Incomplete profile data from Instagram API');
      expect(mockConversation.updateParticipantProfile).not.toHaveBeenCalled();
    });

    it('should return error when profile data is incomplete (missing profile picture)', async () => {
      // Arrange
      const incompleteProfile = {
        ...mockProfile,
        profile_picture_url: undefined,
      };
      conversationRepository.findById.mockResolvedValue(
        mockConversation as any,
      );
      instagramApiService.getUserProfileById.mockResolvedValue(
        incompleteProfile,
      );

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Incomplete profile data from Instagram API');
    });

    it('should gracefully handle Instagram API errors', async () => {
      // Arrange
      conversationRepository.findById.mockResolvedValue(
        mockConversation as any,
      );
      instagramApiService.getUserProfileById.mockRejectedValue(
        new Error('Instagram API rate limit exceeded'),
      );

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Instagram API rate limit exceeded');
      expect(conversationRepository.update).not.toHaveBeenCalled();
    });

    it('should gracefully handle repository update errors', async () => {
      // Arrange
      conversationRepository.findById.mockResolvedValue(
        mockConversation as any,
      );
      instagramApiService.getUserProfileById.mockResolvedValue(mockProfile);
      conversationRepository.update.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should gracefully handle domain validation errors from updateParticipantProfile', async () => {
      // Arrange
      const conversationWithValidationError = {
        ...mockConversation,
        updateParticipantProfile: jest
          .fn()
          .mockImplementation(() => {
            throw new Error('Username cannot be empty');
          }),
      };
      conversationRepository.findById.mockResolvedValue(
        conversationWithValidationError as any,
      );
      instagramApiService.getUserProfileById.mockResolvedValue(mockProfile);

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('Username cannot be empty');
      expect(conversationRepository.update).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions gracefully', async () => {
      // Arrange
      conversationRepository.findById.mockResolvedValue(
        mockConversation as any,
      );
      instagramApiService.getUserProfileById.mockRejectedValue(
        'String error message',
      );

      // Act
      const result = await service.enrichParticipantProfile(
        conversationId,
        accountId,
      );

      // Assert
      expect(result.enriched).toBe(false);
      expect(result.error).toBe('String error message');
    });
  });
});
