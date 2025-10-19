import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InstagramWebhookEvent, WebhookEventType } from '../../../domain/entities/instagram-webhook-event.entity';
import { InstagramWebhookSubscription } from '../../../domain/entities/instagram-webhook-subscription.entity';
import { InstagramWebhookLog, WebhookLogLevel } from '../../../domain/entities/instagram-webhook-log.entity';
import { CreateWebhookSubscriptionDto, WebhookStatsDto } from '../dto/webhook.dto';
import { Database } from '../../../infrastructure/database/database';

@Injectable()
export class InstagramWebhooksService {
  private readonly logger = new Logger(InstagramWebhooksService.name);
  private readonly appSecret: string;
  private readonly verifyToken: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    @Inject(Database) private database: Database,
  ) {
    this.appSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET') || '';
    this.verifyToken = this.configService.get<string>('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') || '';
    this.baseUrl = this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000');

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

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(expectedHash, 'hex'),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Signature verification failed: ${errorMessage}`);
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

    this.logger.debug(`Webhook verification request: mode=${mode}, token=${token}`);

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
  async processWebhook(payload: any, signature: string): Promise<void> {
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
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error processing webhook change: ${errorMessage}`);
        }
      }
    }
  }

  /**
   * Process individual webhook change
   */
  private async processWebhookChange(pageId: string, change: any, fullPayload: any): Promise<void> {
    try {
      // Determine event type
      const eventType = this.determineEventType(change);

      if (!eventType) {
        this.logger.debug(`Unknown webhook change field: ${change.field}`);
        return;
      }

      // Extract event data
      const eventData = this.extractEventData(change, eventType);

      // Generate unique event ID
      const eventId = this.generateEventId(eventType, eventData);

      // Check for duplicate event
      const existingEvent: any[] = await this.database.query(
        'SELECT id FROM instagram_webhook_events WHERE event_id = $1 LIMIT 1',
        [eventId],
      ) as any[];

      if (existingEvent && existingEvent.length > 0) {
        this.logger.debug(`Duplicate webhook event detected: ${eventId}`);

        // Create duplicate record for audit trail
        await this.database.query(
          `INSERT INTO instagram_webhook_events
           (event_type, event_id, payload, is_duplicate, duplicate_of, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [eventType, `${eventId}_dup_${Date.now()}`, fullPayload, true, existingEvent[0].id],
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Failed to process webhook change: ${errorMessage}`, errorStack);
    }
  }

  /**
   * Determine event type from webhook change
   */
  private determineEventType(change: any): WebhookEventType | null {
    const field = change.field || '';
    const value = change.value || change;

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

    return parts.join('_');
  }

  /**
   * Find Instagram account by Instagram business account ID (page ID)
   */
  private async findAccountByPageId(pageId: string): Promise<any | null> {
    try {
      const result = await this.database.query(
        'SELECT id, user_id FROM client_accounts WHERE instagram_business_account_id = $1 LIMIT 1',
        [pageId],
      );
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
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

      await this.createLog(eventId, WebhookLogLevel.ERROR, 'Event processing failed', {
        error,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
      throw new BadRequestException('Instagram account not found or access denied');
    }

    // Build query
    let query = 'SELECT * FROM instagram_webhook_events WHERE instagram_account_id = $1';
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
    const total = countResult && countResult.length > 0 ? parseInt(countResult[0].count) : 0;

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
      throw new BadRequestException('Instagram account not found or access denied');
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
      const errorMessage = error instanceof Error ? error.message : String(error);
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
      throw new BadRequestException('Instagram account not found or access denied');
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
