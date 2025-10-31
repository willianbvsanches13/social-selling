import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../infrastructure/cache/redis.service';
import * as crypto from 'crypto';

export enum WebhookEventType {
  COMMENT = 'comment',
  MENTION = 'mention',
  MESSAGE = 'message',
  STORY_INSIGHT = 'story_insight',
  LIVE_COMMENT = 'live_comment',
  MESSAGE_REACTIONS = 'message_reactions',
  MESSAGING_POSTBACKS = 'messaging_postbacks',
  MESSAGING_SEEN = 'messaging_seen',
  STORY_INSIGHTS = 'story_insights',
}

/**
 * Event Deduplication Service
 *
 * Prevents duplicate processing of webhook events using Redis-based caching
 * with cryptographic hashing for robust duplicate detection within a 5-minute window.
 */
@Injectable()
export class EventDeduplicationService {
  private readonly logger = new Logger(EventDeduplicationService.name);
  private readonly DEDUP_WINDOW = 300; // 5 minutes in seconds
  private readonly KEY_PREFIX = 'webhook:dedup:';

  constructor(private redis: RedisService) {}

  /**
   * Check if an event is a duplicate
   *
   * @param eventType - Type of webhook event
   * @param eventId - Unique event identifier
   * @param payload - Raw event payload for hashing
   * @returns true if event is a duplicate, false otherwise
   */
  async isDuplicate(
    eventType: WebhookEventType,
    eventId: string,
    payload: any,
  ): Promise<boolean> {
    try {
      // Create unique key based on event details
      const dedupKey = this.createDedupKey(eventType, eventId, payload);

      // Check if key exists in Redis
      const exists = await this.redis.exists(dedupKey);

      if (exists) {
        this.logger.warn(`Duplicate event detected: ${eventType}:${eventId}`);
        return true;
      }

      // Store key with expiration (5 minutes)
      await this.redis.set(dedupKey, '1', this.DEDUP_WINDOW);

      return false;
    } catch (error) {
      this.logger.error(
        `Error checking duplicate: ${error instanceof Error ? error.message : String(error)}`,
      );
      // On error, allow processing to continue (fail open)
      return false;
    }
  }

  /**
   * Create deduplication key using event details and payload hash
   *
   * @param eventType - Type of event
   * @param eventId - Event ID
   * @param payload - Raw payload to hash
   * @returns Redis key for deduplication
   */
  private createDedupKey(
    eventType: WebhookEventType,
    eventId: string,
    payload: any,
  ): string {
    // Extract critical fields for hashing
    const criticalFields = this.extractCriticalFields(eventType, payload);

    // Create SHA-256 hash of critical fields
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(criticalFields))
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for efficiency

    return `${this.KEY_PREFIX}${eventType}:${eventId}:${hash}`;
  }

  /**
   * Extract critical fields from payload for deduplication hashing
   *
   * Different event types have different critical fields that uniquely identify them.
   *
   * @param eventType - Type of event
   * @param payload - Raw event payload
   * @returns Object with critical fields for hashing
   */
  private extractCriticalFields(
    eventType: WebhookEventType,
    payload: any,
  ): any {
    switch (eventType) {
      case WebhookEventType.COMMENT:
        return {
          commentId: payload.id || payload.comment_id,
          text: payload.text,
          timestamp: payload.timestamp || payload.created_time,
          from: payload.from?.id,
        };

      case WebhookEventType.MENTION:
        return {
          mediaId: payload.media_id,
          commentId: payload.comment_id,
          timestamp: payload.timestamp || payload.created_time,
        };

      case WebhookEventType.MESSAGE:
        return {
          messageId: payload.id || payload.mid,
          text: payload.message?.text || payload.text,
          timestamp: payload.timestamp || payload.created_time,
          from: payload.from?.id || payload.sender?.id,
        };

      case WebhookEventType.STORY_INSIGHT:
        return {
          mediaId: payload.media_id,
          metric: payload.metric,
          value: payload.value,
          timestamp: payload.timestamp || payload.end_time,
        };

      case WebhookEventType.LIVE_COMMENT:
        return {
          commentId: payload.id || payload.comment_id,
          text: payload.text,
          timestamp: payload.timestamp || payload.created_time,
          from: payload.from?.id,
          broadcastId: payload.broadcast_id,
        };

      case WebhookEventType.MESSAGE_REACTIONS:
        return {
          messageId: payload.id || payload.mid,
          reaction: payload.reaction,
          timestamp: payload.timestamp || payload.created_time,
          from: payload.from?.id || payload.sender?.id,
        };

      case WebhookEventType.MESSAGING_POSTBACKS:
        return {
          messageId: payload.id || payload.mid,
          postback: payload.postback,
          timestamp: payload.timestamp || payload.created_time,
          from: payload.from?.id || payload.sender?.id,
        };

      case WebhookEventType.MESSAGING_SEEN:
        return {
          timestamp: payload.timestamp || payload.created_time,
          from: payload.from?.id || payload.sender?.id,
          watermark: payload.watermark,
        };

      case WebhookEventType.STORY_INSIGHTS:
        return {
          mediaId: payload.media_id,
          metrics: payload.metrics,
          timestamp: payload.timestamp || payload.end_time,
        };

      default:
        // Fallback: use entire payload
        return payload;
    }
  }

  /**
   * Mark an event as processed (after successful processing)
   *
   * @param eventType - Type of event
   * @param eventId - Event ID
   */
  async markAsProcessed(
    eventType: WebhookEventType,
    eventId: string,
  ): Promise<void> {
    const key = `${this.KEY_PREFIX}processed:${eventType}:${eventId}`;
    await this.redis.set(key, '1', this.DEDUP_WINDOW * 2); // Keep for 10 minutes
  }

  /**
   * Check if an event was already processed
   *
   * @param eventType - Type of event
   * @param eventId - Event ID
   * @returns true if event was processed, false otherwise
   */
  async wasProcessed(
    eventType: WebhookEventType,
    eventId: string,
  ): Promise<boolean> {
    const key = `${this.KEY_PREFIX}processed:${eventType}:${eventId}`;
    return await this.redis.exists(key);
  }

  /**
   * Clear all deduplication keys (for testing purposes)
   */
  async clearAll(): Promise<void> {
    const keys = await this.redis.keys(`${this.KEY_PREFIX}*`);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
      this.logger.log(`Cleared ${keys.length} deduplication keys`);
    }
  }
}
