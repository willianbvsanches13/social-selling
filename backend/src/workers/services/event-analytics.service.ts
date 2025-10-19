import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../infrastructure/cache/redis.service';

/**
 * Event metrics structure
 */
export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  processingRate: number;
  averageProcessingTime: number;
  duplicateRate: number;
  autoReplyRate: number;
}

/**
 * Event Analytics Service
 *
 * Tracks webhook event processing metrics in Redis for monitoring and analytics.
 * Provides insights into event volumes, processing performance, and auto-reply usage.
 */
@Injectable()
export class EventAnalyticsService {
  private readonly logger = new Logger(EventAnalyticsService.name);
  private readonly METRICS_KEY = 'webhook:metrics';
  private readonly METRICS_TTL = 86400; // 24 hours

  constructor(private redis: RedisService) {}

  /**
   * Track event processing
   *
   * @param eventType - Type of event processed
   * @param processingTime - Time taken to process (ms)
   * @param isDuplicate - Whether event was a duplicate
   * @param autoReplySent - Whether auto-reply was sent
   */
  async trackEvent(
    eventType: string,
    processingTime: number,
    isDuplicate: boolean,
    autoReplySent: boolean,
  ): Promise<void> {
    try {
      const key = `${this.METRICS_KEY}:${this.getDateKey()}`;

      // Redis pipeline for atomic operations
      const pipeline = [
        // Increment total count
        ['hincrby', key, 'total', 1],
        // Increment event type count
        ['hincrby', key, `type:${eventType}`, 1],
        // Add to total processing time
        ['hincrby', key, 'processing_time', processingTime],
      ];

      if (isDuplicate) {
        pipeline.push(['hincrby', key, 'duplicates', 1]);
      }

      if (autoReplySent) {
        pipeline.push(['hincrby', key, 'auto_replies', 1]);
      }

      // Set expiration
      pipeline.push(['expire', key, this.METRICS_TTL]);

      // Execute all commands atomically
      await this.executePipeline(pipeline);
    } catch (error) {
      this.logger.error(
        `Error tracking event: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - metrics failure shouldn't fail event processing
    }
  }

  /**
   * Get metrics for a specific date
   *
   * @param date - Date to get metrics for (defaults to today)
   * @returns Event metrics
   */
  async getMetrics(date?: Date): Promise<EventMetrics> {
    try {
      const dateKey = date ? this.formatDate(date) : this.getDateKey();
      const key = `${this.METRICS_KEY}:${dateKey}`;

      const data = await this.redis.hgetall(key);

      const total = parseInt(data.total || '0', 10);
      const duplicates = parseInt(data.duplicates || '0', 10);
      const autoReplies = parseInt(data.auto_replies || '0', 10);
      const totalProcessingTime = parseInt(data.processing_time || '0', 10);

      // Extract events by type
      const eventsByType: Record<string, number> = {};
      for (const [field, value] of Object.entries(data)) {
        if (field.startsWith('type:')) {
          const type = field.replace('type:', '');
          eventsByType[type] = parseInt(value, 10);
        }
      }

      return {
        totalEvents: total,
        eventsByType,
        processingRate: total / 24, // Events per hour (assuming 24h period)
        averageProcessingTime: total > 0 ? totalProcessingTime / total : 0,
        duplicateRate: total > 0 ? (duplicates / total) * 100 : 0,
        autoReplyRate: total > 0 ? (autoReplies / total) * 100 : 0,
      };
    } catch (error) {
      this.logger.error(
        `Error getting metrics: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        totalEvents: 0,
        eventsByType: {},
        processingRate: 0,
        averageProcessingTime: 0,
        duplicateRate: 0,
        autoReplyRate: 0,
      };
    }
  }

  /**
   * Get current date key for Redis
   *
   * @returns Date key in YYYY-MM-DD format
   */
  private getDateKey(): string {
    return this.formatDate(new Date());
  }

  /**
   * Format date as YYYY-MM-DD
   *
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Execute Redis pipeline commands
   *
   * @param commands - Array of Redis commands
   */
  private async executePipeline(commands: any[][]): Promise<void> {
    const client = this.redis.getClient();

    for (const [command, ...args] of commands) {
      await client.call(command, ...args);
    }
  }

  /**
   * Clear all metrics (for testing)
   */
  async clearAllMetrics(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.METRICS_KEY}:*`);
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.redis.del(key)));
        this.logger.log(`Cleared ${keys.length} metric keys`);
      }
    } catch (error) {
      this.logger.error(
        `Error clearing metrics: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get metrics for date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of daily metrics
   */
  async getMetricsRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; metrics: EventMetrics }>> {
    const results: Array<{ date: string; metrics: EventMetrics }> = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = this.formatDate(currentDate);
      const metrics = await this.getMetrics(currentDate);

      results.push({
        date: dateKey,
        metrics,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }
}
