import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { IConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import { InstagramApiService } from '../../modules/instagram/services/instagram-api.service';
import { InstagramRateLimiter } from '../../modules/instagram/utils/rate-limiter';

export interface BackfillJobData {
  accountId: string;
  batchSize?: number;
}

export interface BackfillJobResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  duration: number;
  errors?: Array<{
    conversationId: string;
    participantPlatformId: string;
    error: string;
  }>;
}

/**
 * Backfill Participant Profiles Processor
 *
 * Processes conversations with missing participant profiles by fetching
 * profile data from Instagram API with batch processing and rate limiting.
 *
 * Usage:
 * This worker is triggered manually or via scheduled jobs to backfill missing
 * participant profiles in existing conversations. After deployment, it should
 * be triggered to enrich all conversations created before profile fetching
 * feature was implemented.
 *
 * To trigger manually:
 * 1. Add job via API: POST /api/workers/backfill-profiles { accountId, batchSize }
 * 2. Or via Redis CLI: LPUSH bull:backfill-participant-profiles:add '{"accountId":"...","batchSize":10}'
 *
 * Rate Limiting:
 * - Processes with concurrency=1 to prevent overwhelming Instagram API
 * - Respects rate limits with exponential backoff (up to 3 retries per conversation)
 * - Uses InstagramRateLimiter to check and wait for rate limit windows
 * - Default batch size of 10 conversations per job
 *
 * @see InstagramApiService.getUserProfileById for profile fetch implementation
 * @see IConversationRepository.findConversationsWithMissingProfiles for batch query
 */
@Processor('backfill-participant-profiles', {
  concurrency: 1,
})
export class BackfillParticipantProfilesProcessor extends WorkerHost {
  private readonly logger = new Logger(
    BackfillParticipantProfilesProcessor.name,
  );
  private readonly DEFAULT_BATCH_SIZE = 10;
  private readonly MAX_RETRIES = 3;

  constructor(
    @Inject('IConversationRepository')
    private conversationRepository: IConversationRepository,
    private instagramApiService: InstagramApiService,
    private rateLimiter: InstagramRateLimiter,
  ) {
    super();
    this.logger.log(
      'Backfill Participant Profiles Processor initialized with concurrency: 1',
    );
  }

  /**
   * Process backfill job
   *
   * Main processing method that handles a batch of conversations with missing profiles.
   * Fetches conversations, processes each one with error handling, and returns
   * comprehensive statistics about the operation.
   *
   * @param job - BullMQ job containing backfill parameters (accountId, batchSize)
   * @returns Processing result with success/error counts and duration
   */
  async process(
    job: Job<BackfillJobData, BackfillJobResult>,
  ): Promise<BackfillJobResult> {
    const startTime = Date.now();
    const { accountId, batchSize = this.DEFAULT_BATCH_SIZE } = job.data;

    this.logger.log(
      `Starting backfill job for account ${accountId} with batch size ${batchSize} (job: ${job.id})`,
    );

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{
      conversationId: string;
      participantPlatformId: string;
      error: string;
    }> = [];

    try {
      const conversations =
        await this.conversationRepository.findConversationsWithMissingProfiles(
          batchSize,
        );

      if (conversations.length === 0) {
        this.logger.log('No conversations with missing profiles found');
        return {
          success: true,
          totalProcessed: 0,
          successCount: 0,
          errorCount: 0,
          duration: Date.now() - startTime,
        };
      }

      this.logger.log(
        `Found ${conversations.length} conversations with missing profiles`,
      );

      for (const conversation of conversations) {
        try {
          await this.processConversation(accountId, conversation);
          successCount++;
          this.logger.debug(
            `Successfully backfilled profile for conversation ${conversation.id}`,
          );
        } catch (error) {
          errorCount++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push({
            conversationId: conversation.id,
            participantPlatformId: conversation.participantPlatformId,
            error: errorMessage,
          });
          this.logger.warn(
            `Failed to backfill profile for conversation ${conversation.id}: ${errorMessage}`,
          );
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(
        `Backfill job completed: ${successCount} succeeded, ${errorCount} failed, ${duration}ms`,
      );

      return {
        success: true,
        totalProcessed: conversations.length,
        successCount,
        errorCount,
        duration,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Backfill job failed: ${errorMessage}`);

      return {
        success: false,
        totalProcessed: successCount + errorCount,
        successCount,
        errorCount,
        duration,
        errors: errors.length > 0 ? errors : undefined,
      };
    }
  }

  /**
   * Process single conversation with rate limiting and retry logic
   *
   * Fetches profile for a conversation's participant using Instagram API,
   * implements rate limiting checks and exponential backoff retry strategy.
   * Updates conversation entity with fetched profile data (username, profile pic).
   *
   * @param accountId - Client account ID for API authentication
   * @param conversation - Conversation entity to backfill with participant profile
   * @throws Error if all retry attempts fail or profile cannot be fetched
   */
  private async processConversation(
    accountId: string,
    conversation: any,
  ): Promise<void> {
    const waitMs = await this.rateLimiter.shouldWait(accountId);
    if (waitMs > 0) {
      this.logger.debug(
        `Rate limit reached, waiting ${waitMs}ms before processing conversation ${conversation.id}`,
      );
      await this.sleep(waitMs);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const profile = await this.instagramApiService.getUserProfileById(
          accountId,
          conversation.participantPlatformId,
        );

        if (!profile || !profile.username) {
          throw new Error(
            `Profile not found for participant ${conversation.participantPlatformId}`,
          );
        }

        const profilePic = profile.profile_picture_url || '';

        conversation.updateParticipantProfile(profile.username, profilePic);

        await this.conversationRepository.update(conversation);

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES - 1) {
          const backoffMs = this.rateLimiter.calculateBackoff(attempt);
          this.logger.debug(
            `Retry attempt ${attempt + 1}/${this.MAX_RETRIES} after ${backoffMs}ms for conversation ${conversation.id}`,
          );
          await this.sleep(backoffMs);
        }
      }
    }

    throw lastError || new Error('Unknown error during backfill');
  }

  /**
   * Sleep utility for rate limiting and backoff
   *
   * Creates a promise that resolves after the specified delay.
   * Used for implementing rate limiting waits and exponential backoff.
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
