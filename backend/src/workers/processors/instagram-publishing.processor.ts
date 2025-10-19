import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable, Inject } from '@nestjs/common';
import {
  PublishPostJobData,
  PublishPostJobResult,
} from '../queues/instagram-publishing.queue';
import { MediaDownloaderService } from '../services/media-downloader.service';
import { InstagramPublisherService } from '../services/instagram-publisher.service';
import { PostStatusService } from '../services/post-status.service';
import { PublishingNotificationService } from '../services/publishing-notification.service';
import { IClientAccountRepository } from '../../domain/repositories/client-account.repository.interface';
import { IOAuthTokenRepository } from '../../domain/repositories/oauth-token.repository.interface';

/**
 * Instagram Publishing Processor
 * Processes background jobs for publishing scheduled Instagram posts
 */
@Processor('instagram-post-publishing', {
  concurrency: 3, // Process up to 3 jobs concurrently
  limiter: {
    max: 10, // Maximum 10 jobs
    duration: 60000, // Per minute (rate limiting)
  },
})
@Injectable()
export class InstagramPublishingProcessor extends WorkerHost {
  private readonly logger = new Logger(InstagramPublishingProcessor.name);

  constructor(
    @Inject('IClientAccountRepository')
    private readonly accountRepository: IClientAccountRepository,
    @Inject('IOAuthTokenRepository')
    private readonly oauthTokenRepository: IOAuthTokenRepository,
    private readonly mediaDownloader: MediaDownloaderService,
    private readonly instagramPublisher: InstagramPublisherService,
    private readonly postStatusService: PostStatusService,
    private readonly notificationService: PublishingNotificationService,
  ) {
    super();
    this.logger.log('Instagram Publishing Processor initialized');
  }

  /**
   * Process a publishing job
   * @param job BullMQ job containing post data
   * @returns Job result
   */
  async process(
    job: Job<PublishPostJobData, PublishPostJobResult>,
  ): Promise<PublishPostJobResult> {
    const { postId, userId, accountId } = job.data;

    this.logger.log(
      `Processing publish job for post ${postId} (Job ID: ${job.id})`,
    );

    try {
      // Update job progress: Starting
      await job.updateProgress(10);

      // Step 1: Mark post as publishing
      await this.postStatusService.markAsPublishing(postId);
      await job.updateProgress(20);

      // Step 2: Get Instagram account details and access token
      const account = await this.getInstagramAccount(accountId, userId);
      await job.updateProgress(25);

      // Step 3: Download media from S3
      this.logger.log(
        `Downloading ${job.data.mediaUrls.length} media file(s) from S3`,
      );
      const downloadedMedia = await this.mediaDownloader.downloadMultipleMedia(
        job.data.mediaUrls,
      );
      await job.updateProgress(50);

      // Step 4: Publish to Instagram based on media type
      this.logger.log(`Publishing ${job.data.mediaType} to Instagram`);
      let publishResult;

      try {
        if (job.data.mediaType === 'IMAGE' && downloadedMedia.length === 1) {
          // Single image post
          publishResult = await this.instagramPublisher.publishSingleImage(
            account.instagramBusinessAccountId,
            account.accessToken,
            job.data.mediaUrls[0],
            this.buildCaption(job.data),
            {
              location: job.data.location,
              userTags: job.data.userTags,
            },
          );
        } else if (job.data.mediaType === 'CAROUSEL') {
          // Carousel post
          publishResult = await this.instagramPublisher.publishCarousel(
            account.instagramBusinessAccountId,
            account.accessToken,
            job.data.mediaUrls,
            this.buildCaption(job.data),
            {
              location: job.data.location,
            },
          );
        } else if (job.data.mediaType === 'VIDEO') {
          // Video post
          publishResult = await this.instagramPublisher.publishVideo(
            account.instagramBusinessAccountId,
            account.accessToken,
            job.data.mediaUrls[0],
            this.buildCaption(job.data),
            undefined,
            {
              location: job.data.location,
            },
          );
        } else {
          throw new Error(`Unsupported media type: ${job.data.mediaType}`);
        }

        await job.updateProgress(80);

        // Step 5: Add first comment if specified
        if (job.data.firstComment && publishResult.id) {
          this.logger.log('Adding first comment to post');
          await this.instagramPublisher.addCommentToPost(
            publishResult.id,
            account.accessToken,
            job.data.firstComment,
          );
        }

        await job.updateProgress(90);

        // Step 6: Update database with success
        await this.postStatusService.markAsPublished(
          postId,
          publishResult.id,
          publishResult.permalink,
        );

        await job.updateProgress(100);

        // Step 7: Send success notification
        await this.notificationService.sendPostPublishedNotification(
          userId,
          postId,
          publishResult.permalink,
        );

        this.logger.log(
          `Successfully published post ${postId} to Instagram: ${publishResult.id}`,
        );

        return {
          success: true,
          postId,
          instagramPostId: publishResult.id,
          permalink: publishResult.permalink,
          publishedAt: new Date(),
        };
      } finally {
        // Always cleanup media files
        if (downloadedMedia.length > 0) {
          await this.mediaDownloader.cleanupMultipleMedia(
            downloadedMedia.map((m) => m.localPath),
          );
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorCode = (error as any)?.code || 'UNKNOWN';

      this.logger.error(
        `Failed to publish post ${postId}: ${errorMessage}`,
        errorStack,
      );

      // Update database with failure
      const retryCount = job.attemptsMade;
      await this.postStatusService.markAsFailed(
        postId,
        errorMessage,
        retryCount,
      );

      // Send failure notification
      await this.notificationService.sendPostFailedNotification(
        userId,
        postId,
        errorMessage,
      );

      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);

      return {
        success: false,
        postId,
        error: {
          code: errorCode,
          message: errorMessage,
          retryable: isRetryable,
        },
      };
    }
  }

  /**
   * Get Instagram account with access token
   * @param accountId Account ID
   * @param userId User ID for verification
   * @returns Account with access token
   */
  private async getInstagramAccount(accountId: string, userId: string) {
    const account = await this.accountRepository.findById(accountId);

    if (!account) {
      throw new Error(`Instagram account ${accountId} not found`);
    }

    if (account.userId !== userId) {
      throw new Error(
        `Instagram account ${accountId} does not belong to user ${userId}`,
      );
    }

    // Get OAuth token from repository
    const token =
      await this.oauthTokenRepository.findByClientAccountId(accountId);

    if (!token) {
      throw new Error(`Instagram account ${accountId} has no access token`);
    }

    // Check token expiration
    if (token.isExpired) {
      throw new Error(
        `Instagram account ${accountId} access token has expired`,
      );
    }

    // Access the encrypted token (note: encryption/decryption is handled by the repository layer)
    const accessToken = token.encryptedAccessToken;

    if (!accessToken) {
      throw new Error(
        `Instagram account ${accountId} has invalid access token`,
      );
    }

    return {
      instagramBusinessAccountId: account.platformAccountId,
      accessToken,
    };
  }

  /**
   * Build caption with hashtags
   * @param data Job data
   * @returns Complete caption
   */
  private buildCaption(data: PublishPostJobData): string {
    let caption = data.caption;

    // Add hashtags if not already in caption
    if (data.hashtags && data.hashtags.length > 0) {
      const hashtagsInCaption = caption.match(/#\w+/g) || [];
      const existingHashtagSet = new Set(hashtagsInCaption);
      const newHashtags = data.hashtags
        .filter((tag: string) => !existingHashtagSet.has(`#${tag}`))
        .map((tag: string) => `#${tag}`)
        .join(' ');

      if (newHashtags) {
        caption = `${caption}\n\n${newHashtags}`;
      }
    }

    return caption;
  }

  /**
   * Check if error is retryable
   * @param error Error object
   * @returns True if retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Instagram API errors marked as retryable
    if (error.retryable === true) {
      return true;
    }

    // Rate limit errors are retryable
    if (error.message?.includes('rate limit')) {
      return true;
    }

    // Temporary Instagram errors
    const retryableMessages = [
      'temporarily blocked',
      'try again later',
      'server error',
    ];

    return retryableMessages.some((msg) =>
      error.message?.toLowerCase().includes(msg),
    );
  }

  /**
   * Event handler: Job becomes active
   */
  @OnWorkerEvent('active')
  onActive(job: Job<PublishPostJobData>) {
    this.logger.log(`Job ${job.id} for post ${job.data.postId} is now active`);
  }

  /**
   * Event handler: Job completed
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job<PublishPostJobData>, result: PublishPostJobResult) {
    this.logger.log(
      `Job ${job.id} for post ${job.data.postId} completed. Success: ${result.success}`,
    );
  }

  /**
   * Event handler: Job failed
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<PublishPostJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} for post ${job.data.postId} failed: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Event handler: Job progress update
   */
  @OnWorkerEvent('progress')
  onProgress(job: Job<PublishPostJobData>, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }
}
