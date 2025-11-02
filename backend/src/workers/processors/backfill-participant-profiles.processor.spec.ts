import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import {
  BackfillParticipantProfilesProcessor,
  BackfillJobData,
  BackfillJobResult,
} from './backfill-participant-profiles.processor';
import { IConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import { InstagramApiService } from '../../modules/instagram/services/instagram-api.service';
import { InstagramRateLimiter } from '../../modules/instagram/utils/rate-limiter';
import { Conversation } from '../../domain/entities/conversation.entity';
import { InstagramProfileDto } from '../../modules/instagram/dto/instagram-profile.dto';

describe('BackfillParticipantProfilesProcessor', () => {
  let processor: BackfillParticipantProfilesProcessor;
  let mockConversationRepository: Partial<IConversationRepository>;
  let mockInstagramApiService: Partial<InstagramApiService>;
  let mockRateLimiter: Partial<InstagramRateLimiter>;

  beforeEach(async () => {
    mockConversationRepository = {
      findConversationsWithMissingProfiles: jest.fn(),
      update: jest.fn(),
    };

    mockInstagramApiService = {
      getUserProfileById: jest.fn(),
    };

    mockRateLimiter = {
      shouldWait: jest.fn().mockResolvedValue(0),
      calculateBackoff: jest.fn().mockReturnValue(1000),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackfillParticipantProfilesProcessor,
        {
          provide: 'IConversationRepository',
          useValue: mockConversationRepository,
        },
        {
          provide: InstagramApiService,
          useValue: mockInstagramApiService,
        },
        {
          provide: InstagramRateLimiter,
          useValue: mockRateLimiter,
        },
      ],
    }).compile();

    processor = module.get<BackfillParticipantProfilesProcessor>(
      BackfillParticipantProfilesProcessor,
    );
  });

  describe('process', () => {
    it('should fetch conversations with NULL participant_username', async () => {
      const mockConversations: Conversation[] = [];
      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue(mockConversations);

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
          batchSize: 10,
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      await processor.process(job);

      expect(
        mockConversationRepository.findConversationsWithMissingProfiles,
      ).toHaveBeenCalledWith(10);
    });

    it('should call Instagram API for each conversation', async () => {
      const conversation1 = Conversation.create({
        clientAccountId: 'account-123',
        platformConversationId: 'conv-1',
        participantPlatformId: 'ig-user-1',
        metadata: {},
      });
      const conversation2 = Conversation.create({
        clientAccountId: 'account-123',
        platformConversationId: 'conv-2',
        participantPlatformId: 'ig-user-2',
        metadata: {},
      });

      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue([conversation1, conversation2]);

      const mockProfile1: InstagramProfileDto = {
        id: 'ig-user-1',
        username: 'john_doe',
        profile_picture_url: 'https://example.com/pic1.jpg',
      };
      const mockProfile2: InstagramProfileDto = {
        id: 'ig-user-2',
        username: 'jane_doe',
        profile_picture_url: 'https://example.com/pic2.jpg',
      };

      (mockInstagramApiService.getUserProfileById as jest.Mock)
        .mockResolvedValueOnce(mockProfile1)
        .mockResolvedValueOnce(mockProfile2);

      (mockConversationRepository.update as jest.Mock).mockImplementation(
        async (conv) => conv,
      );

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
          batchSize: 10,
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      const result = await processor.process(job);

      expect(mockInstagramApiService.getUserProfileById).toHaveBeenCalledTimes(
        2,
      );
      expect(mockInstagramApiService.getUserProfileById).toHaveBeenCalledWith(
        'account-123',
        'ig-user-1',
      );
      expect(mockInstagramApiService.getUserProfileById).toHaveBeenCalledWith(
        'account-123',
        'ig-user-2',
      );
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
    });

    it('should update conversation with profile data', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'account-123',
        platformConversationId: 'conv-1',
        participantPlatformId: 'ig-user-1',
        metadata: {},
      });

      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue([conversation]);

      const mockProfile: InstagramProfileDto = {
        id: 'ig-user-1',
        username: 'john_doe',
        profile_picture_url: 'https://example.com/pic.jpg',
      };

      (
        mockInstagramApiService.getUserProfileById as jest.Mock
      ).mockResolvedValue(mockProfile);

      (mockConversationRepository.update as jest.Mock).mockImplementation(
        async (conv) => conv,
      );

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
          batchSize: 10,
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      await processor.process(job);

      const updatedConversation = (
        mockConversationRepository.update as jest.Mock
      ).mock.calls[0][0];
      const conversationData = updatedConversation.toJSON();

      expect(conversationData.participantUsername).toBe('john_doe');
      expect(conversationData.participantProfilePic).toBe(
        'https://example.com/pic.jpg',
      );
    });

    it('should respect rate limiting', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'account-123',
        platformConversationId: 'conv-1',
        participantPlatformId: 'ig-user-1',
        metadata: {},
      });

      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue([conversation]);

      (mockRateLimiter.shouldWait as jest.Mock).mockResolvedValue(2000);

      const mockProfile: InstagramProfileDto = {
        id: 'ig-user-1',
        username: 'john_doe',
        profile_picture_url: 'https://example.com/pic.jpg',
      };

      (
        mockInstagramApiService.getUserProfileById as jest.Mock
      ).mockResolvedValue(mockProfile);

      (mockConversationRepository.update as jest.Mock).mockImplementation(
        async (conv) => conv,
      );

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
          batchSize: 10,
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      const startTime = Date.now();
      await processor.process(job);
      const duration = Date.now() - startTime;

      expect(mockRateLimiter.shouldWait).toHaveBeenCalledWith('account-123');
      expect(duration).toBeGreaterThanOrEqual(1900);
    });

    it('should handle API failures gracefully', async () => {
      const conversation1 = Conversation.create({
        clientAccountId: 'account-123',
        platformConversationId: 'conv-1',
        participantPlatformId: 'ig-user-1',
        metadata: {},
      });
      const conversation2 = Conversation.create({
        clientAccountId: 'account-123',
        platformConversationId: 'conv-2',
        participantPlatformId: 'ig-user-2',
        metadata: {},
      });

      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue([conversation1, conversation2]);

      (mockInstagramApiService.getUserProfileById as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'ig-user-2',
          username: 'jane_doe',
          profile_picture_url: 'https://example.com/pic2.jpg',
        });

      (mockConversationRepository.update as jest.Mock).mockImplementation(
        async (conv) => conv,
      );

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
          batchSize: 10,
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      const result = await processor.process(job);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].error).toContain('Profile not found');
    });

    it('should retry on transient failures', async () => {
      const conversation = Conversation.create({
        clientAccountId: 'account-123',
        platformConversationId: 'conv-1',
        participantPlatformId: 'ig-user-1',
        metadata: {},
      });

      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue([conversation]);

      const mockProfile: InstagramProfileDto = {
        id: 'ig-user-1',
        username: 'john_doe',
        profile_picture_url: 'https://example.com/pic.jpg',
      };

      (mockInstagramApiService.getUserProfileById as jest.Mock)
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(mockProfile);

      (mockConversationRepository.update as jest.Mock).mockImplementation(
        async (conv) => conv,
      );

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
          batchSize: 10,
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      const result = await processor.process(job);

      expect(mockInstagramApiService.getUserProfileById).toHaveBeenCalledTimes(
        3,
      );
      expect(mockRateLimiter.calculateBackoff).toHaveBeenCalledTimes(2);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });

    it('should return zero counts when no conversations with missing profiles', async () => {
      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue([]);

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
          batchSize: 10,
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
      expect(mockInstagramApiService.getUserProfileById).not.toHaveBeenCalled();
    });

    it('should use default batch size when not provided', async () => {
      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue([]);

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      await processor.process(job);

      expect(
        mockConversationRepository.findConversationsWithMissingProfiles,
      ).toHaveBeenCalledWith(10);
    });

    it('should track processing statistics accurately', async () => {
      const conversations = Array.from({ length: 5 }, (_, i) =>
        Conversation.create({
          clientAccountId: 'account-123',
          platformConversationId: `conv-${i}`,
          participantPlatformId: `ig-user-${i}`,
          metadata: {},
        }),
      );

      (
        mockConversationRepository.findConversationsWithMissingProfiles as jest.Mock
      ).mockResolvedValue(conversations);

      (mockInstagramApiService.getUserProfileById as jest.Mock)
        .mockResolvedValueOnce({
          id: 'ig-user-0',
          username: 'user0',
          profile_picture_url: 'https://example.com/pic0.jpg',
        })
        .mockResolvedValueOnce({
          id: 'ig-user-1',
          username: 'user1',
          profile_picture_url: 'https://example.com/pic1.jpg',
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'ig-user-3',
          username: 'user3',
          profile_picture_url: 'https://example.com/pic3.jpg',
        })
        .mockResolvedValueOnce(null);

      (mockConversationRepository.update as jest.Mock).mockImplementation(
        async (conv) => conv,
      );

      const job = {
        id: 'job-123',
        data: {
          accountId: 'account-123',
          batchSize: 5,
        },
      } as Job<BackfillJobData, BackfillJobResult>;

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(5);
      expect(result.successCount).toBe(3);
      expect(result.errorCount).toBe(2);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(2);
    }, 15000);
  });
});
