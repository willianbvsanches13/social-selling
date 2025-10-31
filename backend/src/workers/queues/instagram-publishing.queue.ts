import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';

/**
 * Job data structure for publishing Instagram posts
 */
export interface PublishPostJobData {
  postId: string;
  userId: string;
  accountId: string;
  caption: string;
  mediaUrls: string[]; // S3 URLs from MinIO
  mediaType: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL' | 'STORIES';
  scheduledFor: Date;
  publishTime: Date;
  hashtags: string[];
  location?: {
    id: string;
    name: string;
  };
  firstComment?: string;
  userTags?: Array<{
    username: string;
    x: number;
    y: number;
  }>;
  metadata?: {
    retryCount: number;
    originalScheduledTime: Date;
  };
}

/**
 * Result returned after job processing
 */
export interface PublishPostJobResult {
  success: boolean;
  postId: string;
  instagramPostId?: string;
  permalink?: string;
  publishedAt?: Date;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Instagram Publishing Queue Service
 * Manages job scheduling for Instagram post publishing
 */
@Injectable()
export class InstagramPublishingQueue {
  private readonly logger = new Logger(InstagramPublishingQueue.name);

  constructor(
    @InjectQueue('instagram-post-publishing')
    private readonly queue: Queue<PublishPostJobData, PublishPostJobResult>,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('Instagram Publishing Queue initialized');
  }

  /**
   * Add a post publishing job to the queue
   * @param data Job data containing post details
   * @param options Optional job configuration
   * @returns Created job
   */
  async addPublishJob(
    data: PublishPostJobData,
    options?: {
      priority?: number;
      delay?: number;
      jobId?: string;
    },
  ) {
    const jobId = options?.jobId || `publish-${data.postId}`;

    // Calculate delay until scheduled time
    const now = new Date();
    const scheduledTime = new Date(data.scheduledFor);
    const delay = Math.max(0, scheduledTime.getTime() - now.getTime());

    this.logger.log(
      `Adding publish job for post ${data.postId}, scheduled in ${delay}ms`,
    );

    return this.queue.add('publish-post', data, {
      jobId,
      priority: options?.priority || 10,
      delay: options?.delay !== undefined ? options.delay : delay,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 30000, // 30 seconds base delay
      },
      removeOnComplete: {
        count: 1000, // Keep last 1000 completed jobs
        age: 86400, // Remove after 24 hours
      },
      removeOnFail: {
        count: 5000, // Keep last 5000 failed jobs
        age: 604800, // Remove after 7 days
      },
    });
  }

  /**
   * Cancel a scheduled post publishing job
   * @param postId ID of the post to cancel
   * @returns True if job was cancelled, false if not found
   */
  async cancelPublishJob(postId: string): Promise<boolean> {
    const jobId = `publish-${postId}`;
    const job = await this.queue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Cancelled publish job for post ${postId}`);
      return true;
    }

    this.logger.warn(`Job not found for post ${postId}`);
    return false;
  }

  /**
   * Reschedule a post publishing job
   * @param postId ID of the post to reschedule
   * @param newScheduledTime New scheduled time
   */
  async reschedulePublishJob(
    postId: string,
    newScheduledTime: Date,
  ): Promise<void> {
    await this.cancelPublishJob(postId);
    this.logger.log(`Rescheduled post ${postId} to ${newScheduledTime}`);
    // Job will be re-added by the service layer with new time
  }

  /**
   * Get the status of a publishing job
   * @param postId ID of the post
   * @returns Job status information
   */
  async getJobStatus(postId: string) {
    const jobId = `publish-${postId}`;
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id,
      state,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      data: job.data,
    };
  }

  /**
   * Get the underlying queue instance
   * @returns Queue instance
   */
  getQueue(): Queue<PublishPostJobData, PublishPostJobResult> {
    return this.queue;
  }

  /**
   * Get queue metrics for monitoring
   */
  async getMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}
