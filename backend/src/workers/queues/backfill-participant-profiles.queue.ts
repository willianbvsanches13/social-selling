import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/cache/redis.service';

/**
 * Job data structure for backfilling participant profiles
 */
export interface BackfillParticipantProfilesJobData {
  conversationId: string;
  accountId: string;
  timestamp: Date;
}

/**
 * Job result structure after processing
 */
export interface BackfillParticipantProfilesJobResult {
  success: boolean;
  conversationId: string;
  profilesBackfilled: number;
  processingTime: number;
  error?: string;
}

/**
 * Backfill Participant Profiles Queue
 *
 * BullMQ queue for backfilling Instagram participant profiles in conversations.
 * Fetches profile data from Instagram API for participants in a conversation.
 */
@Injectable()
export class BackfillParticipantProfilesQueue {
  private readonly logger = new Logger(BackfillParticipantProfilesQueue.name);
  private readonly queue: Queue<
    BackfillParticipantProfilesJobData,
    BackfillParticipantProfilesJobResult
  >;
  private readonly QUEUE_NAME = 'backfill-participant-profiles';

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    const redisConfig = this.configService.get('redis');

    this.queue = new Queue<
      BackfillParticipantProfilesJobData,
      BackfillParticipantProfilesJobResult
    >(this.QUEUE_NAME, {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db || 0,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 1000,
          age: 86400,
        },
        removeOnFail: {
          count: 5000,
          age: 604800,
        },
      },
    });

    this.logger.log(
      `Backfill Participant Profiles Queue initialized: ${this.QUEUE_NAME}`,
    );
  }

  /**
   * Add backfill job to queue
   *
   * @param data - Backfill job data
   * @param priority - Job priority (1-10, lower is higher priority)
   * @returns Job ID
   */
  async addBackfillJob(
    data: BackfillParticipantProfilesJobData,
    priority: number = 5,
  ): Promise<string> {
    try {
      const job = await this.queue.add('backfill-profiles', data, {
        priority,
        jobId: `backfill-${data.conversationId}-${Date.now()}`,
      });

      this.logger.log(
        `Added backfill job to queue: ${data.conversationId} (job: ${job.id})`,
      );

      return job.id || '';
    } catch (error) {
      this.logger.error(
        `Failed to add backfill job to queue: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Add multiple backfill jobs to queue in bulk
   *
   * @param jobs - Array of backfill job data
   * @returns Array of job IDs
   */
  async addBulkBackfillJobs(
    jobs: Array<{
      data: BackfillParticipantProfilesJobData;
      priority?: number;
    }>,
  ): Promise<string[]> {
    try {
      const bulkJobs = await this.queue.addBulk(
        jobs.map((job, index) => ({
          name: 'backfill-profiles',
          data: job.data,
          opts: {
            priority: job.priority || 5,
            jobId: `backfill-${job.data.conversationId}-${Date.now()}-${index}`,
          },
        })),
      );

      this.logger.log(
        `Added ${bulkJobs.length} backfill jobs to queue in bulk`,
      );

      return bulkJobs.map((job) => job.id || '');
    } catch (error) {
      this.logger.error(
        `Failed to add bulk backfill jobs to queue: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get queue statistics
   *
   * @returns Queue metrics
   */
  async getStats() {
    try {
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
    } catch (error) {
      this.logger.error(
        `Failed to get queue stats: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    this.logger.log('Backfill participant profiles queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.log('Backfill participant profiles queue resumed');
  }

  /**
   * Clear all jobs from queue
   */
  async clear(): Promise<void> {
    await this.queue.drain();
    this.logger.log('Backfill participant profiles queue cleared');
  }

  /**
   * Get the BullMQ queue instance
   *
   * @returns Queue instance
   */
  getQueue(): Queue<
    BackfillParticipantProfilesJobData,
    BackfillParticipantProfilesJobResult
  > {
    return this.queue;
  }

  /**
   * Close queue connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    this.logger.log('Backfill participant profiles queue closed');
  }
}
