import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { WebhookEventType } from '../services/event-deduplication.service';

/**
 * Job data structure for webhook event processing
 */
export interface WebhookEventJobData {
  eventType: WebhookEventType;
  eventId: string;
  accountId: string;
  payload: any;
  timestamp: Date;
}

/**
 * Job result structure after processing
 */
export interface WebhookEventJobResult {
  success: boolean;
  eventId: string;
  eventType: WebhookEventType;
  isDuplicate: boolean;
  autoReplySent: boolean;
  processingTime: number;
  error?: string;
}

/**
 * Webhook Events Queue
 *
 * BullMQ queue for processing Instagram webhook events asynchronously.
 * Handles event deduplication, normalization, storage, and auto-replies.
 */
@Injectable()
export class WebhookEventsQueue {
  private readonly logger = new Logger(WebhookEventsQueue.name);
  private readonly queue: Queue<WebhookEventJobData, WebhookEventJobResult>;
  private readonly QUEUE_NAME = 'instagram-webhook-events';

  constructor(private redisService: RedisService) {
    const redisClient = this.redisService.getClient();

    this.queue = new Queue<WebhookEventJobData, WebhookEventJobResult>(
      this.QUEUE_NAME,
      {
        connection: redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds
          },
          removeOnComplete: {
            count: 1000, // Keep last 1000 completed jobs
            age: 86400, // Keep for 24 hours
          },
          removeOnFail: {
            count: 5000, // Keep last 5000 failed jobs
            age: 604800, // Keep for 7 days
          },
        },
      },
    );

    this.logger.log(`Webhook Events Queue initialized: ${this.QUEUE_NAME}`);
  }

  /**
   * Add webhook event to processing queue
   *
   * @param data - Webhook event job data
   * @param priority - Job priority (1-10, lower is higher priority)
   * @returns Job ID
   */
  async addEvent(
    data: WebhookEventJobData,
    priority: number = 5,
  ): Promise<string> {
    try {
      const job = await this.queue.add('process-webhook', data, {
        priority,
        jobId: `${data.eventType}-${data.eventId}-${Date.now()}`,
      });

      this.logger.log(
        `Added webhook event to queue: ${data.eventType}:${data.eventId} (job: ${job.id})`,
      );

      return job.id || '';
    } catch (error) {
      this.logger.error(
        `Failed to add event to queue: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Add multiple webhook events to queue in bulk
   *
   * @param events - Array of webhook event job data
   * @returns Array of job IDs
   */
  async addBulkEvents(
    events: Array<{ data: WebhookEventJobData; priority?: number }>,
  ): Promise<string[]> {
    try {
      const jobs = await this.queue.addBulk(
        events.map((event, index) => ({
          name: 'process-webhook',
          data: event.data,
          opts: {
            priority: event.priority || 5,
            jobId: `${event.data.eventType}-${event.data.eventId}-${Date.now()}-${index}`,
          },
        })),
      );

      this.logger.log(`Added ${jobs.length} webhook events to queue in bulk`);

      return jobs.map((job) => job.id || '');
    } catch (error) {
      this.logger.error(
        `Failed to add bulk events to queue: ${error instanceof Error ? error.message : String(error)}`,
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
    this.logger.log('Webhook events queue paused');
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    this.logger.log('Webhook events queue resumed');
  }

  /**
   * Clear all jobs from queue
   */
  async clear(): Promise<void> {
    await this.queue.drain();
    this.logger.log('Webhook events queue cleared');
  }

  /**
   * Get the BullMQ queue instance
   *
   * @returns Queue instance
   */
  getQueue(): Queue<WebhookEventJobData, WebhookEventJobResult> {
    return this.queue;
  }

  /**
   * Close queue connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    this.logger.log('Webhook events queue closed');
  }
}
