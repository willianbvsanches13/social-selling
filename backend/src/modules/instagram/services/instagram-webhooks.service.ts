import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  InstagramWebhookEvent,
  WebhookEventType,
} from '../../../domain/entities/instagram-webhook-event.entity';
import { InstagramWebhookSubscription } from '../../../domain/entities/instagram-webhook-subscription.entity';
import {
  InstagramWebhookLog,
  WebhookLogLevel,
} from '../../../domain/entities/instagram-webhook-log.entity';
import {
  CreateWebhookSubscriptionDto,
  WebhookStatsDto,
} from '../dto/webhook.dto';
import { Database } from '../../../infrastructure/database/database';
import { WebhookEventsQueue } from '../../../workers/queues/webhook-events.queue';

@Injectable()
export class InstagramWebhooksService {
  private readonly logger = new Logger(InstagramWebhooksService.name);
  private readonly appSecret: string;
  private readonly verifyToken: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    @Inject(Database) private database: Database,
    private webhookEventsQueue: WebhookEventsQueue,
  ) {
    this.appSecret =
      this.configService.get<string>('INSTAGRAM_APP_SECRET') || '';
    this.verifyToken =
      this.configService.get<string>('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') || '';
    this.baseUrl = this.configService.get<string>(
      'APP_BASE_URL',
      'http://localhost:3000',
    );

    if (!this.appSecret) {
      this.logger.warn('INSTAGRAM_APP_SECRET not configured');
    }
    if (!this.verifyToken) {
      this.logger.warn('INSTAGRAM_WEBHOOK_VERIFY_TOKEN not configured');
    }
  }

  /**
   * Verify webhook signature using HMAC SHA256
   */
  verifySignature(signature: string, payload: string): boolean {
    if (!signature || !this.appSecret) {
      this.logger.warn('Missing X-Hub-Signature-256 header or app secret');
      this.logger.warn(`  - Signature present: ${!!signature}`);
      this.logger.warn(`  - App secret configured: ${!!this.appSecret}`);
      this.logger.warn(
        `  - App secret preview: ${this.appSecret ? this.appSecret.substring(0, 8) + '...' : '(empty)'}`,
      );
      return false;
    }

    try {
      // Remove 'sha256=' prefix if present
      const signatureHash = signature.replace('sha256=', '');

      // Calculate expected signature
      const expectedHash = crypto
        .createHmac('sha256', this.appSecret)
        .update(payload)
        .digest('hex');

      // Log signature verification (full hashes for debugging)
      this.logger.log(`🔐 Webhook signature verification:
        - Received signature: ${signatureHash}
        - Expected signature: ${expectedHash}
        - Payload length: ${payload.length} bytes
        - App secret preview: ${this.appSecret.substring(0, 8)}...
        - Payload preview: ${payload.substring(0, 100)}...`);

      // Constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(expectedHash, 'hex'),
      );

      if (!isValid) {
        this.logger.error('❌ Webhook signature mismatch!');
        this.logger.error(`MISMATCH DETAILS:
          - This means the calculated signature does NOT match what Meta sent
          - Possible causes:
            1. Wrong App Secret (check INSTAGRAM_APP_SECRET in .env)
            2. Request body was modified by nginx/proxy
            3. Character encoding issue
          - Received: ${signatureHash}
          - Expected: ${expectedHash}`);
      } else {
        this.logger.log('✅ Webhook signature is VALID!');
      }

      return isValid;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Signature verification failed with error: ${errorMessage}`,
      );
      this.logger.error(
        `Error stack: ${error instanceof Error ? error.stack : '(no stack)'}`,
      );
      return false;
    }
  }

  /**
   * Verify webhook subscription (GET request from Meta)
   */
  verifySubscription(query: any): string | null {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    this.logger.debug(
      `Webhook verification request: mode=${mode}, token=${token}`,
    );

    if (mode !== 'subscribe') {
      this.logger.warn(`Invalid hub.mode: ${mode}`);
      return null;
    }

    if (token !== this.verifyToken) {
      this.logger.error('Invalid verify token');
      return null;
    }

    this.logger.log('Webhook verification successful');
    return challenge;
  }

  /**
   * Process webhook event from Meta
   */
  async processWebhook(payload: any, _signature: string): Promise<void> {
    this.logger.log('Processing Instagram webhook');

    const { object, entry } = payload;

    if (!object || !entry || entry.length === 0) {
      this.logger.warn('Invalid webhook payload structure');
      return;
    }

    // Process each entry
    for (const item of entry) {
      const pageId = item.id;
      const changes = item.changes || item.messaging || [];

      for (const change of changes) {
        try {
          await this.processWebhookChange(pageId, change, payload);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Error processing webhook change: ${errorMessage}`);
        }
      }
    }
  }

  /**
   * Process individual webhook change
   */
  private async processWebhookChange(
    pageId: string,
    change: any,
    fullPayload: any,
  ): Promise<void> {
    try {
      // Determine event type
      const eventType = this.determineEventType(change);

      if (!eventType) {
        this.logger.debug(`Unknown webhook change field: ${change.field}`);
        return;
      }

      // Log event type recognition
      this.logger.log(`Recognized webhook event type: ${eventType}`);

      // Log payload preview for debugging (new event types)
      if (
        eventType === WebhookEventType.MESSAGE_REACTIONS ||
        eventType === WebhookEventType.MESSAGING_POSTBACKS ||
        eventType === WebhookEventType.MESSAGING_SEEN ||
        eventType === WebhookEventType.STORY_INSIGHTS
      ) {
        this.logger.debug(
          `Payload preview for ${eventType}: ${JSON.stringify(change).substring(0, 200)}...`,
        );
      }

      // Extract event data
      const eventData = this.extractEventData(change, eventType);

      // Log successful extraction
      if (eventData.objectId) {
        this.logger.log(
          `Successfully extracted event data: objectType=${eventData.objectType}, objectId=${eventData.objectId}`,
        );
      } else {
        this.logger.warn(
          `Event data extraction incomplete for ${eventType}: missing objectId`,
        );
      }

      // Generate unique event ID
      const eventId = this.generateEventId(eventType, eventData);
      this.logger.debug(`Generated event ID: ${eventId}`);

      // Check for duplicate event
      const existingEvent: any[] = await this.database.query(
        'SELECT id FROM instagram_webhook_events WHERE event_id = $1 LIMIT 1',
        [eventId],
      );

      if (existingEvent && existingEvent.length > 0) {
        this.logger.debug(`Duplicate webhook event detected: ${eventId}`);

        // Create duplicate record for audit trail
        await this.database.query(
          `INSERT INTO instagram_webhook_events
           (event_type, event_id, payload, is_duplicate, duplicate_of, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [
            eventType,
            `${eventId}_dup_${Date.now()}`,
            fullPayload,
            true,
            existingEvent[0].id,
          ],
        );

        return;
      }

      // Find Instagram account by page ID
      const account = await this.findAccountByPageId(pageId);

      // Create webhook event record
      const eventRecord = await this.database.query(
        `INSERT INTO instagram_webhook_events
         (event_type, event_id, instagram_account_id, object_type, object_id,
          sender_ig_id, sender_username, payload, processed, processing_attempts,
          is_duplicate, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         RETURNING id, event_id, event_type`,
        [
          eventType,
          eventId,
          account?.id || null,
          eventData.objectType,
          eventData.objectId,
          eventData.senderId,
          eventData.senderUsername,
          fullPayload,
          false,
          0,
          false,
        ],
      );

      if (!eventRecord || eventRecord.length === 0) {
        this.logger.error('Failed to create webhook event record');
        return;
      }

      const newEventId = eventRecord[0].id;

      // Update subscription stats if account found
      if (account?.id) {
        await this.updateSubscriptionStats(account.id);
      }

      // Log event creation
      await this.createLog(
        newEventId,
        WebhookLogLevel.INFO,
        'Webhook event received and stored',
        {
          eventType,
          objectType: eventData.objectType,
          senderId: eventData.senderId,
        },
      );

      this.logger.log(`Webhook event created: ${newEventId} (${eventType})`);
      this.logger.log(`🔍 CHECKPOINT 1: After event created log`);
      this.logger.log(
        `🔍 CHECKPOINT 2: account=${JSON.stringify({ id: account?.id, hasQueue: !!this.webhookEventsQueue })}`,
      );

      // Queue event for asynchronous processing
      this.logger.log(`🔍 CHECKPOINT 3: About to check if account?.id`);
      if (account?.id) {
        this.logger.log(`🔍 CHECKPOINT 4: Inside if (account?.id) block`);
        try {
          this.logger.log(
            `🔍 CHECKPOINT 5: About to call webhookEventsQueue.addEvent`,
          );
          await this.webhookEventsQueue.addEvent({
            eventType: eventType as any, // Convert to WebhookEventType from workers
            eventId: newEventId,
            accountId: account.id,
            payload: change, // Pass individual event object, not full webhook envelope
            timestamp: new Date(),
          });

          this.logger.log(
            `Event queued for processing: ${eventType}:${newEventId}`,
          );
        } catch (queueError) {
          const queueErrorMessage =
            queueError instanceof Error
              ? queueError.message
              : String(queueError);
          this.logger.error(
            `Failed to queue event for processing: ${queueErrorMessage}`,
          );

          // Log queue failure but don't fail the webhook reception
          await this.createLog(
            newEventId,
            WebhookLogLevel.ERROR,
            'Failed to queue event for processing',
            { error: queueErrorMessage },
          );
        }
      } else {
        this.logger.warn(
          `Event ${newEventId} not queued: no account found for page ${pageId}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `Failed to process webhook change: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * Determine event type from webhook change
   */
  private determineEventType(change: any): WebhookEventType | null {
    const field = change.field || '';
    const value = change.value || change;

    // Message Reactions - NEW
    if (field === 'message_reactions' || value.message_reactions) {
      this.logger.debug('Detected MESSAGE_REACTIONS event');
      return WebhookEventType.MESSAGE_REACTIONS;
    }

    // Messaging Postbacks (button clicks) - NEW
    if (field === 'messaging_postbacks' || value.messaging_postbacks) {
      this.logger.debug('Detected MESSAGING_POSTBACKS event');
      return WebhookEventType.MESSAGING_POSTBACKS;
    }

    // Messaging Seen (read receipts) - NEW
    if (field === 'messaging_seen' || value.messaging_seen || value.watermark) {
      this.logger.debug('Detected MESSAGING_SEEN event');
      return WebhookEventType.MESSAGING_SEEN;
    }

    // Story Insights - NEW
    if (field === 'story_insights' || value.story_insights) {
      this.logger.debug('Detected STORY_INSIGHTS event');
      return WebhookEventType.STORY_INSIGHTS;
    }

    // Messages
    if (field === 'messages' || change.message) {
      return WebhookEventType.MESSAGE;
    }

    // Comments
    if (field === 'comments' || value.comment_id) {
      return WebhookEventType.COMMENT;
    }

    // Mentions and Story Mentions
    if (field === 'mentions' || (value.media && value.comment_id)) {
      if (value.media?.media_product_type === 'STORY') {
        return WebhookEventType.STORY_MENTION;
      }
      return WebhookEventType.MENTION;
    }

    // Live comments
    if (field === 'live_comments') {
      return WebhookEventType.LIVE_COMMENT;
    }

    this.logger.debug(`Unknown webhook field: ${field}`);
    return null;
  }

  /**
   * Extract relevant event data from webhook change
   */
  private extractEventData(change: any, eventType: WebhookEventType): any {
    const value = change.value || change;
    const data: any = {
      objectType: null,
      objectId: null,
      senderId: null,
      senderUsername: null,
    };

    switch (eventType) {
      case WebhookEventType.MESSAGE_REACTIONS:
        // Extract from message_reactions array
        data.objectType = 'message';
        data.objectId = value.message_reactions?.[0]?.mid || null;
        data.senderId = value.from?.id || value.sender?.id || null;
        data.recipientId = value.recipient?.id || null;
        this.logger.debug(
          `Extracted MESSAGE_REACTIONS data: mid=${data.objectId}, sender=${data.senderId}`,
        );
        break;

      case WebhookEventType.MESSAGING_POSTBACKS:
        // Extract from messaging_postbacks array
        data.objectType = 'postback';
        data.objectId = value.messaging_postbacks?.[0]?.mid || null;
        data.senderId = value.sender?.id || value.from?.id || null;
        data.recipientId = value.recipient?.id || null;
        this.logger.debug(
          `Extracted MESSAGING_POSTBACKS data: mid=${data.objectId}, sender=${data.senderId}`,
        );
        break;

      case WebhookEventType.MESSAGING_SEEN:
        // Extract from messaging_seen event
        data.objectType = 'seen';
        data.objectId = value.messaging_seen?.mid || null;
        data.senderId = value.sender?.id || value.from?.id || null;
        data.recipientId = value.recipient?.id || null;
        this.logger.debug(
          `Extracted MESSAGING_SEEN data: sender=${data.senderId}, watermark=${value.messaging_seen?.watermark || value.watermark}`,
        );
        break;

      case WebhookEventType.STORY_INSIGHTS:
        // Extract from story_insights event
        data.objectType = 'story';
        data.objectId =
          value.story_insights?.media_id || value.media_id || null;
        data.senderId = value.from?.id || null; // Account ID
        this.logger.debug(
          `Extracted STORY_INSIGHTS data: media_id=${data.objectId}`,
        );
        break;

      case WebhookEventType.MESSAGE:
        data.objectType = 'message';
        data.objectId = value.messages?.[0]?.id || value.message?.mid;
        data.senderId = value.sender?.id;
        break;

      case WebhookEventType.COMMENT:
      case WebhookEventType.MENTION:
        data.objectType = 'comment';
        data.objectId = value.comment_id || value.id;
        data.senderId = value.from?.id;
        data.senderUsername = value.from?.username;
        break;

      case WebhookEventType.STORY_MENTION:
        data.objectType = 'story';
        data.objectId = value.media?.id;
        data.senderId = value.from?.id;
        data.senderUsername = value.from?.username;
        break;

      case WebhookEventType.LIVE_COMMENT:
        data.objectType = 'live_video';
        data.objectId = value.video_id;
        data.senderId = value.from?.id;
        data.senderUsername = value.from?.username;
        break;
    }

    return data;
  }

  /**
   * Generate unique event ID for deduplication
   */
  private generateEventId(eventType: WebhookEventType, eventData: any): string {
    const parts = [
      eventType,
      eventData.objectId || 'unknown',
      eventData.senderId || 'unknown',
    ];

    // Add timestamp for event types that can have multiple occurrences
    // (reactions, postbacks, seen events)
    if (
      eventType === WebhookEventType.MESSAGE_REACTIONS ||
      eventType === WebhookEventType.MESSAGING_POSTBACKS ||
      eventType === WebhookEventType.MESSAGING_SEEN
    ) {
      // Use current timestamp as part of ID for uniqueness
      // In production, this would come from the webhook payload
      const timestamp = eventData.timestamp || Date.now();
      parts.push(timestamp.toString());
    }

    return parts.join('_');
  }

  /**
   * Find Instagram account by Instagram business account ID (page ID)
   */
  private async findAccountByPageId(pageId: string): Promise<any | null> {
    try {
      const result = await this.database.query(
        'SELECT id, user_id FROM client_accounts WHERE platform_account_id = $1 AND platform = $2 AND deleted_at IS NULL LIMIT 1',
        [pageId, 'instagram'],
      );
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error finding account by page ID: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Update subscription statistics
   */
  private async updateSubscriptionStats(accountId: string): Promise<void> {
    try {
      await this.database.query(
        `UPDATE instagram_webhook_subscriptions
         SET last_event_received_at = NOW(),
             events_received_count = events_received_count + 1,
             updated_at = NOW()
         WHERE instagram_account_id = $1`,
        [accountId],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error updating subscription stats: ${errorMessage}`);
    }
  }

  /**
   * Mark event as processed
   */
  async markEventProcessed(eventId: string): Promise<void> {
    try {
      await this.database.query(
        `UPDATE instagram_webhook_events
         SET processed = TRUE,
             processed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [eventId],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error marking event as processed: ${errorMessage}`);
    }
  }

  /**
   * Mark event as failed
   */
  async markEventFailed(eventId: string, error: string): Promise<void> {
    try {
      await this.database.query(
        `UPDATE instagram_webhook_events
         SET processing_attempts = processing_attempts + 1,
             last_processing_error = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [eventId, error],
      );

      await this.createLog(
        eventId,
        WebhookLogLevel.ERROR,
        'Event processing failed',
        {
          error,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error marking event as failed: ${errorMessage}`);
    }
  }

  /**
   * Get webhook events for an account
   */
  async getEvents(
    userId: string,
    accountId: string,
    filters?: {
      eventType?: string;
      processed?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{ events: any[]; total: number; page: number; limit: number }> {
    const { eventType, processed, page = 1, limit = 50 } = filters || {};

    // Verify user has access to account
    const accessCheck = await this.database.query(
      'SELECT id FROM client_accounts WHERE id = $1 AND user_id = $2 LIMIT 1',
      [accountId, userId],
    );

    if (!accessCheck || accessCheck.length === 0) {
      throw new BadRequestException(
        'Instagram account not found or access denied',
      );
    }

    // Build query
    let query =
      'SELECT * FROM instagram_webhook_events WHERE instagram_account_id = $1';
    const params: any[] = [accountId];
    let paramCount = 2;

    if (eventType) {
      query += ` AND event_type = $${paramCount}`;
      params.push(eventType);
      paramCount++;
    }

    if (processed !== undefined) {
      query += ` AND processed = $${paramCount}`;
      params.push(processed);
      paramCount++;
    }

    // Get total count
    const countResult = await this.database.query(
      `SELECT COUNT(*) as count FROM (${query}) as t`,
      params,
    );
    const total =
      countResult && countResult.length > 0
        ? parseInt(countResult[0].count)
        : 0;

    // Get paginated results
    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const events = await this.database.query(query, params);

    return {
      events: events || [],
      total,
      page,
      limit,
    };
  }

  /**
   * Get webhook statistics for an account
   */
  async getStats(userId: string, accountId: string): Promise<WebhookStatsDto> {
    // Verify access
    const accessCheck = await this.database.query(
      'SELECT id FROM client_accounts WHERE id = $1 AND user_id = $2 LIMIT 1',
      [accountId, userId],
    );

    if (!accessCheck || accessCheck.length === 0) {
      throw new BadRequestException(
        'Instagram account not found or access denied',
      );
    }

    const stats = await this.database.query(
      `SELECT
        COUNT(*) as total_events,
        SUM(CASE WHEN processed = TRUE THEN 1 ELSE 0 END) as processed_events,
        SUM(CASE WHEN processed = FALSE AND is_duplicate = FALSE THEN 1 ELSE 0 END) as pending_events,
        SUM(CASE WHEN is_duplicate = TRUE THEN 1 ELSE 0 END) as duplicate_events,
        SUM(CASE WHEN processed = FALSE AND processing_attempts >= 3 AND is_duplicate = FALSE THEN 1 ELSE 0 END) as failed_events
       FROM instagram_webhook_events
       WHERE instagram_account_id = $1`,
      [accountId],
    );

    const typeStats = await this.database.query(
      `SELECT event_type, COUNT(*) as count
       FROM instagram_webhook_events
       WHERE instagram_account_id = $1
       GROUP BY event_type`,
      [accountId],
    );

    const result = stats && stats.length > 0 ? stats[0] : {};
    const eventsByType: Record<string, number> = {};

    if (typeStats) {
      for (const row of typeStats) {
        eventsByType[row.event_type] = parseInt(row.count);
      }
    }

    return {
      totalEvents: parseInt(result.total_events || 0),
      processedEvents: parseInt(result.processed_events || 0),
      pendingEvents: parseInt(result.pending_events || 0),
      failedEvents: parseInt(result.failed_events || 0),
      duplicateEvents: parseInt(result.duplicate_events || 0),
      eventsByType,
    };
  }

  /**
   * Create webhook subscription
   */
  async createSubscription(
    userId: string,
    accountId: string,
    fields: string[],
    verifyToken?: string,
  ): Promise<any> {
    // Verify account access
    const account = await this.database.query(
      'SELECT id FROM client_accounts WHERE id = $1 AND user_id = $2 LIMIT 1',
      [accountId, userId],
    );

    if (!account || account.length === 0) {
      throw new BadRequestException('Instagram account not found');
    }

    const token = verifyToken || crypto.randomBytes(32).toString('hex');
    const callbackUrl = `${this.baseUrl}/api/instagram/webhooks`;

    // Check if subscription exists
    const existing = await this.database.query(
      'SELECT id FROM instagram_webhook_subscriptions WHERE instagram_account_id = $1 LIMIT 1',
      [accountId],
    );

    if (existing && existing.length > 0) {
      // Update existing
      await this.database.query(
        `UPDATE instagram_webhook_subscriptions
         SET subscription_fields = $1,
             verify_token = $2,
             callback_url = $3,
             updated_at = NOW()
         WHERE instagram_account_id = $4`,
        [JSON.stringify(fields), token, callbackUrl, accountId],
      );
    } else {
      // Create new
      await this.database.query(
        `INSERT INTO instagram_webhook_subscriptions
         (instagram_account_id, subscription_fields, callback_url, verify_token, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [accountId, JSON.stringify(fields), callbackUrl, token, true],
      );
    }

    return {
      accountId,
      callbackUrl,
      verifyToken: token,
      fields,
    };
  }

  /**
   * Create webhook log entry
   */
  private async createLog(
    eventId: string | null,
    level: WebhookLogLevel,
    message: string,
    context: any,
  ): Promise<void> {
    try {
      await this.database.query(
        `INSERT INTO instagram_webhook_logs
         (event_id, log_level, message, context, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [eventId, level, message, context],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create webhook log: ${errorMessage}`);
    }
  }

  /**
   * Retry failed events
   */
  async retryFailedEvents(userId: string, accountId: string): Promise<number> {
    // Verify access
    const accessCheck = await this.database.query(
      'SELECT id FROM client_accounts WHERE id = $1 AND user_id = $2 LIMIT 1',
      [accountId, userId],
    );

    if (!accessCheck || accessCheck.length === 0) {
      throw new BadRequestException(
        'Instagram account not found or access denied',
      );
    }

    const failedEvents = await this.database.query(
      `SELECT id FROM instagram_webhook_events
       WHERE instagram_account_id = $1
       AND processed = FALSE
       AND is_duplicate = FALSE
       AND processing_attempts < 3
       ORDER BY created_at ASC
       LIMIT 100`,
      [accountId],
    );

    // Reset retry count for failed events
    if (failedEvents && failedEvents.length > 0) {
      const eventIds = failedEvents.map((e) => e.id);
      await this.database.query(
        `UPDATE instagram_webhook_events
         SET processing_attempts = 0,
             last_processing_error = NULL,
             updated_at = NOW()
         WHERE id = ANY($1)`,
        [eventIds],
      );
    }

    return failedEvents ? failedEvents.length : 0;
  }
}
