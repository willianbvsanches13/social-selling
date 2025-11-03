import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import * as crypto from 'crypto';
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
import { WebhookMessageHandler } from '../../modules/instagram/handlers/webhook-message.handler';

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
    private webhookMessageHandler: WebhookMessageHandler,
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
    try {
      switch (eventType) {
        case WebhookEventType.COMMENT:
        case WebhookEventType.LIVE_COMMENT:
          await this.storeComment(accountId, event);
          break;

        case WebhookEventType.MENTION:
          await this.storeMention(accountId, event);
          break;

        case WebhookEventType.MESSAGE:
          // Use WebhookMessageHandler for message processing
          await this.processMessageWithHandler(accountId, event);
          break;

        case WebhookEventType.STORY_INSIGHT:
          await this.storeStoryInsight(accountId, event);
          break;

        // New event types
        case WebhookEventType.MESSAGE_REACTIONS:
          this.logger.log(
            `Storing message reaction: ${event.messageId || event.mid}`,
          );
          await this.storeMessageReaction(event, accountId);
          break;

        case WebhookEventType.MESSAGING_POSTBACKS:
          this.logger.log(
            `Storing messaging postback: ${event.messageId || event.mid}`,
          );
          await this.storeMessagingPostback(event, accountId);
          break;

        case WebhookEventType.MESSAGING_SEEN:
          this.logger.log(
            `Storing messaging seen event for account: ${accountId}`,
          );
          await this.storeMessagingSeen(event, accountId);
          break;

        case WebhookEventType.STORY_INSIGHTS:
          this.logger.log(`Storing story insights: ${event.mediaId}`);
          await this.storeStoryInsights(event, accountId);
          break;

        default:
          this.logger.warn(`Unknown event type for storage: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `Error storing ${eventType} event: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
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
   * Process Instagram message using WebhookMessageHandler
   */
  private async processMessageWithHandler(
    accountId: string,
    event: any,
  ): Promise<void> {
    try {
      // Get the webhook event from database to pass to handler
      const webhookEvent = await this.database.oneOrNone<any>(
        `SELECT id, event_type, payload FROM instagram_webhook_events
         WHERE instagram_account_id = $1
         AND object_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [accountId, event.id],
      );

      if (!webhookEvent) {
        this.logger.warn(
          `Webhook event not found for message ${event.id}, using fallback`,
        );
        // Fallback: create a temporary event object
        const tempEvent = {
          id: crypto.randomUUID(),
          payload: {
            entry: [
              {
                id: event.entryId || event.pageId,
                messaging: [
                  {
                    sender: event.from,
                    recipient: event.recipient || event.to,
                    timestamp: new Date(event.timestamp).getTime(),
                    message: {
                      mid: event.id,
                      text: event.text,
                      attachments: event.attachments,
                      is_echo: event.isEcho,
                    },
                  },
                ],
              },
            ],
          },
        };

        await this.webhookMessageHandler.processMessageEvent(
          tempEvent as any,
          accountId,
        );
        return;
      }

      // Use the handler with the actual webhook event
      await this.webhookMessageHandler.processMessageEvent(
        {
          id: webhookEvent.id,
          payload: webhookEvent.payload,
        } as any,
        accountId,
      );
    } catch (error) {
      this.logger.error(
        `Error processing message with handler: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
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
   * Store Instagram message reaction in database
   * Handles both 'react' and 'unreact' actions
   */
  private async storeMessageReaction(
    event: any,
    accountId: string,
  ): Promise<void> {
    try {
      const timestamp = event.timestamp
        ? new Date(event.timestamp * 1000)
        : new Date();

      await this.database.none(
        `INSERT INTO instagram_message_reactions
         (message_id, conversation_id, account_id, sender_ig_id, recipient_ig_id,
          action, reaction_type, emoji, timestamp, raw_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT (message_id, sender_ig_id, timestamp)
         DO UPDATE SET
           action = EXCLUDED.action,
           reaction_type = EXCLUDED.reaction_type,
           emoji = EXCLUDED.emoji,
           raw_data = EXCLUDED.raw_data,
           updated_at = NOW()`,
        [
          event.messageId || event.mid,
          event.conversationId || null,
          accountId,
          event.senderId || event.from?.id,
          event.recipientId || event.recipient?.id,
          event.action || 'react',
          event.reactionType || event.reaction_type || null,
          event.emoji || event.reaction || null,
          timestamp,
          event,
        ],
      );

      this.logger.debug(
        `Stored message reaction: ${event.action} on message ${event.messageId || event.mid}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store message reaction: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Store Instagram messaging postback in database
   * Used for button clicks from ice breakers, quick replies, persistent menu
   */
  private async storeMessagingPostback(
    event: any,
    accountId: string,
  ): Promise<void> {
    try {
      const timestamp = event.timestamp
        ? new Date(event.timestamp * 1000)
        : new Date();

      await this.database.none(
        `INSERT INTO instagram_messaging_postbacks
         (message_id, conversation_id, account_id, sender_ig_id, recipient_ig_id,
          is_self, postback_title, postback_payload, timestamp, raw_data,
          processed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         ON CONFLICT (message_id, sender_ig_id)
         DO UPDATE SET
           postback_title = EXCLUDED.postback_title,
           postback_payload = EXCLUDED.postback_payload,
           raw_data = EXCLUDED.raw_data,
           updated_at = NOW()`,
        [
          event.messageId || event.mid,
          event.conversationId || null,
          accountId,
          event.senderId || event.sender?.id,
          event.recipientId || event.recipient?.id,
          event.isSelf || false,
          event.postbackTitle || event.title || null,
          event.postbackPayload || event.payload || null,
          timestamp,
          event,
          false, // Initially not processed for auto-reply workflow
        ],
      );

      this.logger.debug(
        `Stored messaging postback: ${event.postbackPayload || event.payload}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store messaging postback: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Store Instagram messaging seen event in database
   * Tracks read receipts for message engagement metrics
   */
  private async storeMessagingSeen(
    event: any,
    accountId: string,
  ): Promise<void> {
    try {
      const timestamp = event.watermark
        ? new Date(event.watermark * 1000)
        : event.timestamp
          ? new Date(event.timestamp * 1000)
          : new Date();

      await this.database.none(
        `INSERT INTO instagram_messaging_seen
         (last_message_id, conversation_id, account_id, reader_ig_id,
          recipient_ig_id, timestamp, raw_data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (last_message_id, reader_ig_id, timestamp)
         DO NOTHING`,
        [
          event.lastMessageId || event.mid || null,
          event.conversationId || null,
          accountId,
          event.readerId || event.senderId || event.sender?.id,
          event.recipientId || event.recipient?.id,
          timestamp,
          event,
        ],
      );

      this.logger.debug(
        `Stored messaging seen event for message: ${event.lastMessageId || event.mid}`,
      );
    } catch (error) {
      // Seen events are immutable, so duplicates are silently ignored
      if (
        error instanceof Error &&
        error.message.includes('duplicate key value')
      ) {
        this.logger.debug(
          `Duplicate messaging seen event ignored: ${event.lastMessageId || event.mid}`,
        );
        return;
      }

      this.logger.error(
        `Failed to store messaging seen: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Store Instagram story insights in database
   * Stores story performance metrics (reach, impressions, exits, replies, etc.)
   */
  private async storeStoryInsights(
    event: any,
    accountId: string,
  ): Promise<void> {
    try {
      const timestamp = event.timestamp
        ? new Date(event.timestamp * 1000)
        : new Date();
      const insights = event.insights || {};

      // Store or update story insights with aggregation
      await this.database.none(
        `INSERT INTO instagram_story_insights
         (media_id, account_id, reach, impressions, exits, replies,
          taps_forward, taps_back, timestamp, raw_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT (media_id, account_id)
         DO UPDATE SET
           reach = GREATEST(instagram_story_insights.reach, EXCLUDED.reach),
           impressions = GREATEST(instagram_story_insights.impressions, EXCLUDED.impressions),
           exits = COALESCE(EXCLUDED.exits, instagram_story_insights.exits),
           replies = COALESCE(EXCLUDED.replies, instagram_story_insights.replies),
           taps_forward = COALESCE(EXCLUDED.taps_forward, instagram_story_insights.taps_forward),
           taps_back = COALESCE(EXCLUDED.taps_back, instagram_story_insights.taps_back),
           raw_data = EXCLUDED.raw_data,
           updated_at = NOW()`,
        [
          event.mediaId || event.media_id,
          accountId,
          insights.reach || 0,
          insights.impressions || 0,
          insights.exits || 0,
          insights.replies || 0,
          insights.taps_forward || insights.tapsForward || 0,
          insights.taps_back || insights.tapsBack || 0,
          timestamp,
          event,
        ],
      );

      this.logger.debug(
        `Stored story insights for media: ${event.mediaId || event.media_id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store story insights: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
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
