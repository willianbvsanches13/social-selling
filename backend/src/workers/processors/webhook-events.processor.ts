import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  WebhookEventJobData,
  WebhookEventJobResult,
} from '../queues/webhook-events.queue';
import {
  EventDeduplicationService,
  WebhookEventType,
} from '../services/event-deduplication.service';
import { EventNormalizerService } from '../services/event-normalizer.service';
import { AutoReplyService } from '../services/auto-reply.service';
import { EventAnalyticsService } from '../services/event-analytics.service';
import { Database } from '../../infrastructure/database/database';

/**
 * Webhook Events Processor
 *
 * Processes Instagram webhook events from BullMQ queue with concurrency of 5.
 * Orchestrates event deduplication, normalization, storage, auto-replies, and analytics.
 */
@Processor('instagram-webhook-events', {
  concurrency: 5,
})
export class WebhookEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookEventsProcessor.name);

  constructor(
    @Inject(Database) private database: Database,
    private deduplicationService: EventDeduplicationService,
    private normalizerService: EventNormalizerService,
    private autoReplyService: AutoReplyService,
    private analyticsService: EventAnalyticsService,
  ) {
    super();
    this.logger.log('Webhook Events Processor initialized with concurrency: 5');
  }

  /**
   * Process webhook event job
   *
   * @param job - BullMQ job containing webhook event data
   * @returns Processing result
   */
  async process(
    job: Job<WebhookEventJobData, WebhookEventJobResult>,
  ): Promise<WebhookEventJobResult> {
    const startTime = Date.now();
    const { eventType, eventId, accountId, payload, timestamp } = job.data;

    this.logger.log(
      `Processing webhook event: ${eventType}:${eventId} (job: ${job.id})`,
    );

    try {
      // Step 1: Check for duplicates
      const isDuplicate = await this.deduplicationService.isDuplicate(
        eventType,
        eventId,
        payload,
      );

      if (isDuplicate) {
        const processingTime = Date.now() - startTime;

        // Track duplicate in analytics
        await this.analyticsService.trackEvent(
          eventType,
          processingTime,
          true,
          false,
        );

        this.logger.warn(
          `Duplicate event skipped: ${eventType}:${eventId} (${processingTime}ms)`,
        );

        return {
          success: true,
          eventId,
          eventType,
          isDuplicate: true,
          autoReplySent: false,
          processingTime,
        };
      }

      // Step 2: Normalize event
      const normalizedEvent = this.normalizerService.normalizeEvent(
        eventType,
        payload,
      );

      // Validate normalized event
      const isValid = this.normalizerService.validateNormalizedEvent(
        normalizedEvent,
        eventType,
      );

      if (!isValid) {
        throw new Error(`Invalid normalized event: ${eventType}:${eventId}`);
      }

      // Step 3: Store event in database
      await this.storeEvent(eventType, accountId, normalizedEvent);

      // Step 4: Check and send auto-reply
      let autoReplySent = false;

      if (
        eventType === WebhookEventType.COMMENT ||
        eventType === WebhookEventType.MESSAGE
      ) {
        autoReplySent = await this.handleAutoReply(
          eventType,
          accountId,
          normalizedEvent,
        );
      }

      // Step 5: Mark as processed
      await this.deduplicationService.markAsProcessed(eventType, eventId);

      const processingTime = Date.now() - startTime;

      // Step 6: Track analytics
      await this.analyticsService.trackEvent(
        eventType,
        processingTime,
        false,
        autoReplySent,
      );

      this.logger.log(
        `Successfully processed: ${eventType}:${eventId} (${processingTime}ms, auto-reply: ${autoReplySent})`,
      );

      return {
        success: true,
        eventId,
        eventType,
        isDuplicate: false,
        autoReplySent,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to process event ${eventType}:${eventId}: ${errorMessage}`,
      );

      // Track failed event in analytics
      await this.analyticsService.trackEvent(
        eventType,
        processingTime,
        false,
        false,
      );

      return {
        success: false,
        eventId,
        eventType,
        isDuplicate: false,
        autoReplySent: false,
        processingTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Store event in database based on event type
   *
   * @param eventType - Type of webhook event
   * @param accountId - Instagram account ID
   * @param event - Normalized event data
   */
  private async storeEvent(
    eventType: WebhookEventType,
    accountId: string,
    event: any,
  ): Promise<void> {
    switch (eventType) {
      case WebhookEventType.COMMENT:
      case WebhookEventType.LIVE_COMMENT:
        await this.storeComment(accountId, event);
        break;

      case WebhookEventType.MENTION:
        await this.storeMention(accountId, event);
        break;

      case WebhookEventType.MESSAGE:
        await this.storeMessage(accountId, event);
        break;

      case WebhookEventType.STORY_INSIGHT:
        await this.storeStoryInsight(accountId, event);
        break;

      default:
        this.logger.warn(`Unknown event type for storage: ${eventType}`);
    }
  }

  /**
   * Store Instagram comment in database
   */
  private async storeComment(accountId: string, comment: any): Promise<void> {
    await this.database.none(
      `INSERT INTO instagram_comments
       (id, text, timestamp, from_id, from_username, media_id, account_id, parent_id, like_count, is_hidden, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         text = EXCLUDED.text,
         like_count = EXCLUDED.like_count,
         is_hidden = EXCLUDED.is_hidden,
         updated_at = CURRENT_TIMESTAMP`,
      [
        comment.id,
        comment.text,
        comment.timestamp,
        comment.from.id,
        comment.from.username,
        comment.media.id,
        accountId,
        comment.parentId || null,
        comment.likeCount || 0,
        comment.isHidden || false,
        comment,
      ],
    );
  }

  /**
   * Store Instagram mention in database
   */
  private async storeMention(accountId: string, mention: any): Promise<void> {
    await this.database.none(
      `INSERT INTO instagram_mentions
       (id, media_id, comment_id, timestamp, mentioned_in, from_id, from_username, account_id, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         updated_at = CURRENT_TIMESTAMP`,
      [
        mention.id,
        mention.mediaId,
        mention.commentId || null,
        mention.timestamp,
        mention.mentionedIn,
        mention.from.id,
        mention.from.username,
        accountId,
        mention,
      ],
    );
  }

  /**
   * Store Instagram direct message in database
   */
  private async storeMessage(accountId: string, message: any): Promise<void> {
    // Check if conversation exists, create if not
    await this.database.none(
      `INSERT INTO conversations (id, account_id, participant_id, participant_username)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.conversationId,
        accountId,
        message.from.id,
        message.from.username || 'unknown',
      ],
    );

    // Store message
    await this.database.none(
      `INSERT INTO messages
       (id, conversation_id, text, attachments, timestamp, from_id, is_echo, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        message.id,
        message.conversationId,
        message.text || null,
        message.attachments ? JSON.stringify(message.attachments) : null,
        message.timestamp,
        message.from.id,
        message.isEcho || false,
        message,
      ],
    );
  }

  /**
   * Store Instagram story insight in database
   */
  private async storeStoryInsight(
    accountId: string,
    insight: any,
  ): Promise<void> {
    await this.database.none(
      `INSERT INTO instagram_story_insights
       (media_id, metric, value, timestamp, account_id, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (media_id, metric, timestamp) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = CURRENT_TIMESTAMP`,
      [
        insight.mediaId,
        insight.metric,
        insight.value,
        insight.timestamp,
        accountId,
        insight,
      ],
    );
  }

  /**
   * Handle auto-reply logic
   *
   * @param eventType - Type of event (comment or message)
   * @param accountId - Instagram account ID
   * @param event - Normalized event
   * @returns true if auto-reply was sent
   */
  private async handleAutoReply(
    eventType: WebhookEventType,
    accountId: string,
    event: any,
  ): Promise<boolean> {
    try {
      // Get text from event
      const text =
        eventType === WebhookEventType.COMMENT ? event.text : event.text || '';

      if (!text) {
        return false;
      }

      // Check if auto-reply should be sent
      const { should, rule } = await this.autoReplyService.shouldAutoReply(
        accountId,
        text,
        eventType === WebhookEventType.COMMENT ? 'comment' : 'message',
      );

      if (!should || !rule) {
        return false;
      }

      // Get access token for account
      const account = await this.database.oneOrNone<{
        instagram_account_id: string;
        access_token: string;
      }>(
        `SELECT instagram_account_id, access_token FROM client_accounts WHERE id = $1`,
        [accountId],
      );

      if (!account?.access_token) {
        this.logger.error(
          `No access token found for account ${accountId}, cannot send auto-reply`,
        );
        return false;
      }

      // Send auto-reply
      let result;

      if (eventType === WebhookEventType.COMMENT) {
        result = await this.autoReplyService.replyToComment(
          event,
          rule.response,
          account.access_token,
        );
      } else {
        result = await this.autoReplyService.replyToMessage(
          event,
          rule.response,
          account.instagram_account_id,
          account.access_token,
        );
      }

      // Log auto-reply if successful
      if (result.sent && result.messageId) {
        await this.autoReplyService.logAutoReply(
          accountId,
          event.id,
          rule.id,
          result.messageId,
        );

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Auto-reply error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't fail the entire job if auto-reply fails
      return false;
    }
  }
}
