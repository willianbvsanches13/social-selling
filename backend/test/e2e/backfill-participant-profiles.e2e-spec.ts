import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { AppModule } from '../../src/app.module';
import { BackfillParticipantProfilesProcessor } from '../../src/workers/processors/backfill-participant-profiles.processor';
import { IConversationRepository } from '../../src/domain/repositories/conversation.repository.interface';
import { InstagramApiService } from '../../src/modules/instagram/services/instagram-api.service';

describe('Backfill Participant Profiles E2E Tests', () => {
  let app: INestApplication;
  let queue: Queue;
  let processor: BackfillParticipantProfilesProcessor;
  let conversationRepository: IConversationRepository;
  let instagramApiService: InstagramApiService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const queueToken = getQueueToken('backfill-participant-profiles');
    queue = app.get(queueToken);
    processor = app.get(BackfillParticipantProfilesProcessor);
    conversationRepository = app.get('IConversationRepository');
    instagramApiService = app.get(InstagramApiService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up any remaining jobs in the queue
    await queue.obliterate({ force: true });
  });

  describe('CLI Command Execution', () => {
    it('should add job to queue with valid parameters', async () => {
      // Arrange
      const accountId = 'test-account-123';
      const batchSize = 10;

      // Act
      const job = await queue.add('backfill', {
        accountId,
        batchSize,
      });

      // Assert
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.accountId).toBe(accountId);
      expect(job.data.batchSize).toBe(batchSize);

      // Verify job is in the queue
      const jobs = await queue.getJobs(['waiting']);
      expect(jobs.length).toBe(1);
      expect(jobs[0].id).toBe(job.id);
    });

    it('should add job to queue without batch size (uses default)', async () => {
      // Arrange
      const accountId = 'test-account-456';

      // Act
      const job = await queue.add('backfill', {
        accountId,
      });

      // Assert
      expect(job).toBeDefined();
      expect(job.data.accountId).toBe(accountId);
      expect(job.data.batchSize).toBeUndefined();
    });

    it('should handle multiple jobs in queue', async () => {
      // Arrange & Act
      const job1 = await queue.add('backfill', {
        accountId: 'account-1',
      });
      const job2 = await queue.add('backfill', {
        accountId: 'account-2',
      });
      const job3 = await queue.add('backfill', {
        accountId: 'account-3',
      });

      // Assert
      const jobs = await queue.getJobs(['waiting']);
      expect(jobs.length).toBe(3);
      expect(jobs.map((j) => j.id)).toContain(job1.id);
      expect(jobs.map((j) => j.id)).toContain(job2.id);
      expect(jobs.map((j) => j.id)).toContain(job3.id);
    });
  });

  describe('Job Processing', () => {
    it('should process job with conversations needing enrichment', async () => {
      // Arrange
      const accountId = 'test-account-789';
      const mockConversations = [
        {
          id: 'conv-1',
          participantPlatformId: 'instagram-user-1',
          participantUsername: null,
          participantProfilePic: null,
          updateParticipantProfile: jest.fn(),
        },
        {
          id: 'conv-2',
          participantPlatformId: 'instagram-user-2',
          participantUsername: null,
          participantProfilePic: null,
          updateParticipantProfile: jest.fn(),
        },
      ];

      // Mock repository to return conversations
      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockResolvedValue(mockConversations as any);

      // Mock Instagram API to return profiles
      jest.spyOn(instagramApiService, 'getUserProfileById').mockResolvedValue({
        id: 'instagram-user-1',
        username: 'test_user',
        profile_picture_url: 'https://instagram.com/profile/test_user.jpg',
      });

      // Mock repository update
      jest.spyOn(conversationRepository, 'update').mockResolvedValue({} as any);

      // Act
      const job = await queue.add('backfill', {
        accountId,
        batchSize: 5,
      });

      const result = await processor.process(job as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(
        conversationRepository.findConversationsWithMissingProfiles,
      ).toHaveBeenCalledWith(accountId, 5);
    });

    it('should handle job with no conversations to process', async () => {
      // Arrange
      const accountId = 'test-account-empty';

      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockResolvedValue([]);

      // Act
      const job = await queue.add('backfill', {
        accountId,
      });

      const result = await processor.process(job as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalProcessed).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });

    it('should track errors when profile fetch fails', async () => {
      // Arrange
      const accountId = 'test-account-errors';
      const mockConversations = [
        {
          id: 'conv-fail-1',
          participantPlatformId: 'instagram-user-fail',
          participantUsername: null,
          participantProfilePic: null,
          updateParticipantProfile: jest.fn(),
        },
      ];

      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockResolvedValue(mockConversations as any);

      // Mock Instagram API to return null (profile not found)
      jest
        .spyOn(instagramApiService, 'getUserProfileById')
        .mockResolvedValue(null);

      // Act
      const job = await queue.add('backfill', {
        accountId,
      });

      const result = await processor.process(job as any);

      // Assert
      expect(result.success).toBe(true); // Job completes but with errors
      expect(result.totalProcessed).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].conversationId).toBe('conv-fail-1');
    });

    it('should use default batch size when not specified', async () => {
      // Arrange
      const accountId = 'test-account-default';

      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockResolvedValue([]);

      // Act
      const job = await queue.add('backfill', {
        accountId,
      });

      await processor.process(job as any);

      // Assert - Should use default batch size of 10
      expect(
        conversationRepository.findConversationsWithMissingProfiles,
      ).toHaveBeenCalledWith(accountId, 10);
    });

    it('should respect custom batch size', async () => {
      // Arrange
      const accountId = 'test-account-custom';
      const customBatchSize = 25;

      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockResolvedValue([]);

      // Act
      const job = await queue.add('backfill', {
        accountId,
        batchSize: customBatchSize,
      });

      await processor.process(job as any);

      // Assert
      expect(
        conversationRepository.findConversationsWithMissingProfiles,
      ).toHaveBeenCalledWith(accountId, customBatchSize);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const accountId = 'test-account-repo-error';

      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      const job = await queue.add('backfill', {
        accountId,
      });

      await expect(processor.process(job as any)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle Instagram API errors for individual conversations', async () => {
      // Arrange
      const accountId = 'test-account-api-error';
      const mockConversations = [
        {
          id: 'conv-api-error-1',
          participantPlatformId: 'instagram-user-error',
          participantUsername: null,
          participantProfilePic: null,
          updateParticipantProfile: jest.fn(),
        },
      ];

      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockResolvedValue(mockConversations as any);

      jest
        .spyOn(instagramApiService, 'getUserProfileById')
        .mockRejectedValue(new Error('Instagram API rate limit exceeded'));

      // Act
      const job = await queue.add('backfill', {
        accountId,
      });

      const result = await processor.process(job as any);

      // Assert - Should track error but not fail entire job
      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(1);
      expect(result.errors![0].error).toContain('rate limit');
    });

    it('should track job processing duration', async () => {
      // Arrange
      const accountId = 'test-account-duration';

      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockResolvedValue([]);

      // Act
      const job = await queue.add('backfill', {
        accountId,
      });

      const startTime = Date.now();
      const result = await processor.process(job as any);
      const endTime = Date.now();

      // Assert
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime);
    });
  });

  describe('Queue Management', () => {
    it('should retrieve job status from queue', async () => {
      // Arrange
      const accountId = 'test-account-status';
      const job = await queue.add('backfill', {
        accountId,
      });

      // Act
      const retrievedJob = await queue.getJob(job.id!);

      // Assert
      expect(retrievedJob).toBeDefined();
      expect(retrievedJob!.id).toBe(job.id);
      expect(retrievedJob!.data.accountId).toBe(accountId);
    });

    it('should list all waiting jobs in queue', async () => {
      // Arrange
      await queue.add('backfill', { accountId: 'account-1' });
      await queue.add('backfill', { accountId: 'account-2' });
      await queue.add('backfill', { accountId: 'account-3' });

      // Act
      const waitingJobs = await queue.getJobs(['waiting']);

      // Assert
      expect(waitingJobs.length).toBe(3);
    });

    it('should clean up completed jobs', async () => {
      // Arrange
      const job = await queue.add('backfill', {
        accountId: 'test-account-cleanup',
      });

      jest
        .spyOn(conversationRepository, 'findConversationsWithMissingProfiles')
        .mockResolvedValue([]);

      // Act
      await processor.process(job as any);
      await job.moveToCompleted('success', '0', false);

      // Assert
      const completedJobs = await queue.getJobs(['completed']);
      expect(completedJobs.length).toBeGreaterThan(0);
    });
  });
});
