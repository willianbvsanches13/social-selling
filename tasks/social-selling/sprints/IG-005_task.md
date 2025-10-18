# IG-005: Instagram Webhooks

**Epic:** Social Selling Platform - Instagram Integration
**Sprint:** Sprint 2
**Story Points:** 8
**Priority:** High
**Assignee:** Backend Team
**Status:** Ready for Development

---

## Overview

Implement robust Instagram Webhook infrastructure to receive real-time events from Instagram including comments, mentions, direct messages, and story mentions. This includes webhook endpoint creation, signature verification, event processing with BullMQ, duplicate detection, retry logic, and comprehensive error handling.

---

## Business Value

- **Real-Time Updates**: Instant notification of customer interactions
- **Automated Responses**: Quick replies to comments and messages
- **Customer Engagement**: Never miss a customer inquiry or mention
- **Sales Opportunities**: Capture leads immediately when they engage
- **Operational Efficiency**: Reduce manual monitoring of Instagram

---

## Technical Requirements

### 1. Database Schema

#### Webhook Events Table
```sql
-- Migration: 20250118000008_create_instagram_webhook_events.sql

CREATE TABLE instagram_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL, -- comment, mention, message, story_mention, live_comment
    event_id VARCHAR(255) NOT NULL,
    instagram_account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    object_type VARCHAR(50), -- comment, message, story, media
    object_id VARCHAR(255),
    sender_ig_id VARCHAR(255),
    sender_username VARCHAR(255),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_attempts INTEGER DEFAULT 0,
    last_processing_error TEXT,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of UUID REFERENCES instagram_webhook_events(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id)
);

CREATE INDEX idx_webhook_events_type ON instagram_webhook_events(event_type);
CREATE INDEX idx_webhook_events_account ON instagram_webhook_events(instagram_account_id);
CREATE INDEX idx_webhook_events_processed ON instagram_webhook_events(processed);
CREATE INDEX idx_webhook_events_event_id ON instagram_webhook_events(event_id);
CREATE INDEX idx_webhook_events_created_at ON instagram_webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_sender ON instagram_webhook_events(sender_ig_id);
```

#### Webhook Subscriptions Table
```sql
-- Migration: 20250118000009_create_instagram_webhook_subscriptions.sql

CREATE TABLE instagram_webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    subscription_fields JSONB NOT NULL DEFAULT '[]', -- ["messages", "comments", "mentions", "story_insights"]
    callback_url TEXT NOT NULL,
    verify_token VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    last_event_received_at TIMESTAMP WITH TIME ZONE,
    events_received_count INTEGER DEFAULT 0,
    subscription_errors INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(instagram_account_id)
);

CREATE INDEX idx_webhook_subscriptions_active ON instagram_webhook_subscriptions(is_active);
CREATE INDEX idx_webhook_subscriptions_account ON instagram_webhook_subscriptions(instagram_account_id);
```

#### Webhook Logs Table
```sql
-- Migration: 20250118000010_create_instagram_webhook_logs.sql

CREATE TABLE instagram_webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES instagram_webhook_events(id) ON DELETE CASCADE,
    log_level VARCHAR(50) NOT NULL, -- info, warning, error, debug
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_logs_event ON instagram_webhook_logs(event_id);
CREATE INDEX idx_webhook_logs_level ON instagram_webhook_logs(log_level);
CREATE INDEX idx_webhook_logs_created_at ON instagram_webhook_logs(created_at DESC);
```

---

### 2. DTOs (Data Transfer Objects)

```typescript
// src/modules/instagram/dto/webhook.dto.ts

import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WebhookEventType {
  COMMENT = 'comment',
  MENTION = 'mention',
  MESSAGE = 'message',
  STORY_MENTION = 'story_mention',
  LIVE_COMMENT = 'live_comment',
}

export enum SubscriptionField {
  MESSAGES = 'messages',
  COMMENTS = 'comments',
  MENTIONS = 'mentions',
  STORY_INSIGHTS = 'story_insights',
  LIVE_COMMENTS = 'live_comments',
}

export class WebhookVerificationDto {
  @ApiProperty({ description: 'Hub mode (subscribe/unsubscribe)' })
  @IsString()
  'hub.mode': string;

  @ApiProperty({ description: 'Verify token' })
  @IsString()
  'hub.verify_token': string;

  @ApiProperty({ description: 'Challenge string' })
  @IsString()
  'hub.challenge': string;
}

export class WebhookChangeValueDto {
  @ApiPropertyOptional()
  from?: {
    id: string;
    username?: string;
  };

  @ApiPropertyOptional()
  media?: {
    id: string;
    media_product_type?: string;
  };

  @ApiPropertyOptional()
  comment_id?: string;

  @ApiPropertyOptional()
  text?: string;

  @ApiPropertyOptional()
  messages?: Array<{
    id: string;
    text?: string;
    attachments?: any[];
    timestamp?: number;
  }>;

  @ApiPropertyOptional()
  sender?: {
    id: string;
  };

  @ApiPropertyOptional()
  recipient?: {
    id: string;
  };
}

export class WebhookChangeDto {
  @ApiProperty({ description: 'Field that changed (messages, comments, mentions)' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Change value data' })
  value: WebhookChangeValueDto;
}

export class WebhookEntryDto {
  @ApiProperty({ description: 'Instagram user/page ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Event timestamp' })
  time: number;

  @ApiProperty({ description: 'Array of changes', type: [WebhookChangeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookChangeDto)
  changes?: WebhookChangeDto[];

  @ApiPropertyOptional({ description: 'Messaging events (alternative format)' })
  messaging?: any[];
}

export class InstagramWebhookDto {
  @ApiProperty({ description: 'Object type (instagram, page)' })
  @IsString()
  object: string;

  @ApiProperty({ description: 'Array of entries', type: [WebhookEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEntryDto)
  entry: WebhookEntryDto[];
}

export class CreateWebhookSubscriptionDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsString()
  instagramAccountId: string;

  @ApiProperty({ description: 'Subscription fields', enum: SubscriptionField, isArray: true })
  @IsArray()
  @IsEnum(SubscriptionField, { each: true })
  subscriptionFields: SubscriptionField[];

  @ApiPropertyOptional({ description: 'Custom verify token (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  verifyToken?: string;
}

export class WebhookEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WebhookEventType })
  eventType: WebhookEventType;

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  objectType: string;

  @ApiProperty()
  objectId: string;

  @ApiProperty()
  senderIgId: string;

  @ApiProperty()
  senderUsername: string;

  @ApiProperty()
  processed: boolean;

  @ApiProperty()
  processingAttempts: number;

  @ApiProperty()
  createdAt: Date;
}

export class WebhookStatsDto {
  @ApiProperty()
  totalEvents: number;

  @ApiProperty()
  processedEvents: number;

  @ApiProperty()
  pendingEvents: number;

  @ApiProperty()
  failedEvents: number;

  @ApiProperty()
  duplicateEvents: number;

  @ApiProperty()
  eventsByType: Record<string, number>;
}
```

---

### 3. Service Implementation

```typescript
// src/modules/instagram/services/instagram-webhooks.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InstagramWebhookEvent } from '../entities/instagram-webhook-event.entity';
import { InstagramWebhookSubscription } from '../entities/instagram-webhook-subscription.entity';
import { InstagramWebhookLog } from '../entities/instagram-webhook-log.entity';
import { InstagramAccount } from '../entities/instagram-account.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as crypto from 'crypto';

@Injectable()
export class InstagramWebhooksService {
  private readonly logger = new Logger(InstagramWebhooksService.name);
  private readonly appSecret: string;

  constructor(
    @InjectRepository(InstagramWebhookEvent)
    private eventRepository: Repository<InstagramWebhookEvent>,
    @InjectRepository(InstagramWebhookSubscription)
    private subscriptionRepository: Repository<InstagramWebhookSubscription>,
    @InjectRepository(InstagramWebhookLog)
    private logRepository: Repository<InstagramWebhookLog>,
    @InjectRepository(InstagramAccount)
    private accountRepository: Repository<InstagramAccount>,
    @InjectQueue('instagram-webhooks') private webhookQueue: Queue,
    private configService: ConfigService,
  ) {
    this.appSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(signature: string, payload: string): boolean {
    if (!signature) {
      this.logger.warn('Missing X-Hub-Signature-256 header');
      return false;
    }

    // Remove 'sha256=' prefix
    const signatureHash = signature.replace('sha256=', '');

    // Calculate expected signature
    const expectedHash = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex'),
    );

    if (!isValid) {
      this.logger.error('Invalid webhook signature');
    }

    return isValid;
  }

  /**
   * Verify webhook subscription (GET request)
   */
  verifySubscription(query: any): string | null {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    this.logger.log(`Webhook verification request: mode=${mode}, token=${token}`);

    // Check if this is a subscription verification
    if (mode !== 'subscribe') {
      this.logger.warn(`Invalid hub.mode: ${mode}`);
      return null;
    }

    // Verify token matches
    const expectedToken = this.configService.get<string>('INSTAGRAM_WEBHOOK_VERIFY_TOKEN');
    if (token !== expectedToken) {
      this.logger.error('Invalid verify token');
      return null;
    }

    this.logger.log('Webhook verification successful');
    return challenge;
  }

  /**
   * Process webhook event (POST request)
   */
  async processWebhook(payload: any, signature: string): Promise<void> {
    this.logger.log('Processing Instagram webhook');

    const { object, entry } = payload;

    if (object !== 'instagram' && object !== 'page') {
      this.logger.warn(`Unexpected webhook object type: ${object}`);
      return;
    }

    if (!entry || entry.length === 0) {
      this.logger.warn('Webhook has no entries');
      return;
    }

    // Process each entry
    for (const item of entry) {
      const pageId = item.id;
      const changes = item.changes || item.messaging || [];

      for (const change of changes) {
        await this.processWebhookChange(pageId, change, payload);
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
        this.logger.warn(`Unknown webhook change field: ${change.field}`);
        return;
      }

      // Extract event data
      const eventData = this.extractEventData(change, eventType);

      // Generate unique event ID
      const eventId = this.generateEventId(eventType, eventData);

      // Check for duplicate
      const existingEvent = await this.eventRepository.findOne({
        where: { event_id: eventId },
      });

      if (existingEvent) {
        this.logger.debug(`Duplicate webhook event: ${eventId}`);

        // Mark as duplicate
        const duplicateEvent = this.eventRepository.create({
          event_type: eventType,
          event_id: `${eventId}_dup_${Date.now()}`,
          payload: fullPayload,
          is_duplicate: true,
          duplicate_of: existingEvent.id,
        });

        await this.eventRepository.save(duplicateEvent);
        return;
      }

      // Find Instagram account
      const account = await this.findAccountByPageId(pageId);

      // Create webhook event
      const event = this.eventRepository.create({
        event_type: eventType,
        event_id: eventId,
        instagram_account_id: account?.id,
        object_type: eventData.objectType,
        object_id: eventData.objectId,
        sender_ig_id: eventData.senderId,
        sender_username: eventData.senderUsername,
        payload: fullPayload,
        processed: false,
      });

      await this.eventRepository.save(event);

      // Update subscription stats
      if (account) {
        await this.updateSubscriptionStats(account.id);
      }

      // Queue for processing
      await this.queueEventProcessing(event.id, eventType, eventData);

      this.logger.log(`Webhook event queued: ${event.id} (${eventType})`);

      // Log event
      await this.createLog(event.id, 'info', 'Webhook event received and queued', {
        eventType,
        objectId: eventData.objectId,
      });

    } catch (error) {
      this.logger.error(`Failed to process webhook change: ${error.message}`, error.stack);

      // Log error
      await this.createLog(null, 'error', 'Failed to process webhook change', {
        error: error.message,
        change,
      });
    }
  }

  /**
   * Determine event type from webhook change
   */
  private determineEventType(change: any): string | null {
    const field = change.field || '';
    const value = change.value || change;

    // Messages
    if (field === 'messages' || change.message) {
      return 'message';
    }

    // Comments
    if (field === 'comments' || value.comment_id) {
      return 'comment';
    }

    // Mentions
    if (field === 'mentions' || (value.media && value.comment_id)) {
      // Check if it's a story mention
      if (value.media?.media_product_type === 'STORY') {
        return 'story_mention';
      }
      return 'mention';
    }

    // Live comments
    if (field === 'live_comments') {
      return 'live_comment';
    }

    return null;
  }

  /**
   * Extract event data from webhook change
   */
  private extractEventData(change: any, eventType: string): any {
    const value = change.value || change;
    const data: any = {
      objectType: null,
      objectId: null,
      senderId: null,
      senderUsername: null,
    };

    switch (eventType) {
      case 'message':
        data.objectType = 'message';
        data.objectId = value.messages?.[0]?.id || value.message?.mid;
        data.senderId = value.sender?.id;
        break;

      case 'comment':
      case 'mention':
        data.objectType = 'comment';
        data.objectId = value.comment_id || value.id;
        data.senderId = value.from?.id;
        data.senderUsername = value.from?.username;
        break;

      case 'story_mention':
        data.objectType = 'story';
        data.objectId = value.media?.id;
        data.senderId = value.from?.id;
        data.senderUsername = value.from?.username;
        break;

      case 'live_comment':
        data.objectType = 'live_video';
        data.objectId = value.video_id;
        data.senderId = value.from?.id;
        data.senderUsername = value.from?.username;
        break;
    }

    return data;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(eventType: string, eventData: any): string {
    const parts = [
      eventType,
      eventData.objectId || 'unknown',
      eventData.senderId || 'unknown',
    ];

    return parts.join('_');
  }

  /**
   * Find Instagram account by page ID
   */
  private async findAccountByPageId(pageId: string): Promise<InstagramAccount | null> {
    return this.accountRepository.findOne({
      where: { instagram_business_account_id: pageId },
    });
  }

  /**
   * Update subscription stats
   */
  private async updateSubscriptionStats(accountId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { instagram_account_id: accountId },
    });

    if (subscription) {
      subscription.last_event_received_at = new Date();
      subscription.events_received_count += 1;
      await this.subscriptionRepository.save(subscription);
    }
  }

  /**
   * Queue event for processing
   */
  private async queueEventProcessing(eventId: string, eventType: string, eventData: any): Promise<void> {
    const jobName = `process-${eventType}`;

    await this.webhookQueue.add(
      jobName,
      {
        eventId,
        eventType,
        eventData,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  /**
   * Mark event as processed
   */
  async markEventProcessed(eventId: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });

    if (event) {
      event.processed = true;
      event.processed_at = new Date();
      await this.eventRepository.save(event);
    }
  }

  /**
   * Mark event as failed
   */
  async markEventFailed(eventId: string, error: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });

    if (event) {
      event.processing_attempts += 1;
      event.last_processing_error = error;
      await this.eventRepository.save(event);

      await this.createLog(eventId, 'error', 'Event processing failed', {
        error,
        attempts: event.processing_attempts,
      });
    }
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
    const account = await this.accountRepository.findOne({
      where: { id: accountId, user_id: userId },
    });

    if (!account) {
      throw new BadRequestException('Instagram account not found');
    }

    // Generate verify token if not provided
    const token = verifyToken || crypto.randomBytes(32).toString('hex');

    // Generate callback URL
    const baseUrl = this.configService.get<string>('APP_BASE_URL');
    const callbackUrl = `${baseUrl}/api/instagram/webhooks`;

    // Check if subscription already exists
    let subscription = await this.subscriptionRepository.findOne({
      where: { instagram_account_id: accountId },
    });

    if (subscription) {
      // Update existing subscription
      subscription.subscription_fields = fields;
      subscription.verify_token = token;
      subscription.callback_url = callbackUrl;
      subscription.updated_at = new Date();
    } else {
      // Create new subscription
      subscription = this.subscriptionRepository.create({
        instagram_account_id: accountId,
        subscription_fields: fields,
        callback_url: callbackUrl,
        verify_token: token,
        is_active: true,
      });
    }

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`Webhook subscription created/updated for account ${accountId}`);

    return {
      id: subscription.id,
      callbackUrl,
      verifyToken: token,
      fields,
    };
  }

  /**
   * Get webhook events
   */
  async getEvents(
    accountId: string,
    userId: string,
    filters?: {
      eventType?: string;
      processed?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{ events: any[]; total: number; page: number; limit: number }> {
    // Verify user has access to account
    const account = await this.accountRepository.findOne({
      where: { id: accountId, user_id: userId },
    });

    if (!account) {
      throw new BadRequestException('Instagram account not found');
    }

    const { eventType, processed, page = 1, limit = 50 } = filters || {};

    const queryBuilder = this.eventRepository.createQueryBuilder('event');
    queryBuilder.where('event.instagram_account_id = :accountId', { accountId });

    if (eventType) {
      queryBuilder.andWhere('event.event_type = :eventType', { eventType });
    }

    if (processed !== undefined) {
      queryBuilder.andWhere('event.processed = :processed', { processed });
    }

    queryBuilder.orderBy('event.created_at', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [events, total] = await queryBuilder.getManyAndCount();

    return {
      events,
      total,
      page,
      limit,
    };
  }

  /**
   * Get webhook statistics
   */
  async getStats(accountId: string, userId: string): Promise<any> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, user_id: userId },
    });

    if (!account) {
      throw new BadRequestException('Instagram account not found');
    }

    const totalEvents = await this.eventRepository.count({
      where: { instagram_account_id: accountId },
    });

    const processedEvents = await this.eventRepository.count({
      where: { instagram_account_id: accountId, processed: true },
    });

    const pendingEvents = await this.eventRepository.count({
      where: { instagram_account_id: accountId, processed: false, is_duplicate: false },
    });

    const duplicateEvents = await this.eventRepository.count({
      where: { instagram_account_id: accountId, is_duplicate: true },
    });

    const failedEvents = await this.eventRepository.count({
      where: { instagram_account_id: accountId, processed: false, processing_attempts: 3 },
    });

    // Events by type
    const eventsByTypeRaw = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.event_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('event.instagram_account_id = :accountId', { accountId })
      .groupBy('event.event_type')
      .getRawMany();

    const eventsByType: Record<string, number> = {};
    for (const row of eventsByTypeRaw) {
      eventsByType[row.type] = parseInt(row.count, 10);
    }

    return {
      totalEvents,
      processedEvents,
      pendingEvents,
      failedEvents,
      duplicateEvents,
      eventsByType,
    };
  }

  /**
   * Create webhook log
   */
  private async createLog(eventId: string | null, level: string, message: string, context: any): Promise<void> {
    try {
      const log = this.logRepository.create({
        event_id: eventId,
        log_level: level,
        message,
        context,
      });

      await this.logRepository.save(log);
    } catch (error) {
      this.logger.error(`Failed to create webhook log: ${error.message}`);
    }
  }

  /**
   * Retry failed events
   */
  async retryFailedEvents(accountId: string, userId: string): Promise<number> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, user_id: userId },
    });

    if (!account) {
      throw new BadRequestException('Instagram account not found');
    }

    const failedEvents = await this.eventRepository.find({
      where: {
        instagram_account_id: accountId,
        processed: false,
        is_duplicate: false,
      },
      order: { created_at: 'ASC' },
      take: 100, // Process up to 100 at a time
    });

    for (const event of failedEvents) {
      const eventData = this.extractEventData(event.payload.entry?.[0]?.changes?.[0], event.event_type);

      await this.queueEventProcessing(event.id, event.event_type, eventData);
    }

    this.logger.log(`Retrying ${failedEvents.length} failed events`);

    return failedEvents.length;
  }
}
```

---

### 4. Controller Implementation

```typescript
// src/modules/instagram/controllers/instagram-webhooks.controller.ts

import { Controller, Get, Post, Body, Query, Param, Headers, UseGuards, Request, HttpCode, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramWebhooksService } from '../services/instagram-webhooks.service';
import { CreateWebhookSubscriptionDto, WebhookStatsDto } from '../dto/webhook.dto';

@ApiTags('Instagram Webhooks')
@Controller('instagram/webhooks')
export class InstagramWebhooksController {
  constructor(private webhooksService: InstagramWebhooksService) {}

  /**
   * Webhook verification endpoint (GET)
   */
  @Get()
  @HttpCode(200)
  @ApiExcludeEndpoint() // Don't show in Swagger (Meta will call this)
  async verifyWebhook(@Query() query: any): Promise<string> {
    const challenge = this.webhooksService.verifySubscription(query);

    if (!challenge) {
      throw new Error('Webhook verification failed');
    }

    return challenge;
  }

  /**
   * Webhook event endpoint (POST)
   */
  @Post()
  @HttpCode(200)
  @ApiExcludeEndpoint() // Don't show in Swagger (Meta will call this)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
  ): Promise<{ status: string }> {
    const rawBody = req.rawBody?.toString('utf8') || '';
    const payload = JSON.parse(rawBody);

    // Verify signature
    const isValid = this.webhooksService.verifySignature(signature, rawBody);

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Process webhook asynchronously
    await this.webhooksService.processWebhook(payload, signature);

    return { status: 'ok' };
  }

  /**
   * Create webhook subscription
   */
  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create webhook subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async createSubscription(@Request() req, @Body() dto: CreateWebhookSubscriptionDto) {
    return this.webhooksService.createSubscription(
      req.user.id,
      dto.instagramAccountId,
      dto.subscriptionFields,
      dto.verifyToken,
    );
  }

  /**
   * Get webhook events
   */
  @Get('events/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook events for account' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async getEvents(
    @Request() req,
    @Param('accountId') accountId: string,
    @Query('eventType') eventType?: string,
    @Query('processed') processed?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.webhooksService.getEvents(req.user.id, accountId, {
      eventType,
      processed,
      page,
      limit,
    });
  }

  /**
   * Get webhook statistics
   */
  @Get('stats/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', type: WebhookStatsDto })
  async getStats(@Request() req, @Param('accountId') accountId: string) {
    return this.webhooksService.getStats(accountId, req.user.id);
  }

  /**
   * Retry failed events
   */
  @Post('retry/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry failed webhook events' })
  @ApiResponse({ status: 200, description: 'Events queued for retry' })
  async retryFailedEvents(@Request() req, @Param('accountId') accountId: string) {
    const count = await this.webhooksService.retryFailedEvents(accountId, req.user.id);
    return { retriedCount: count };
  }
}
```

---

### 5. BullMQ Queue Processor

```typescript
// src/modules/instagram/processors/instagram-webhooks.processor.ts

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InstagramWebhooksService } from '../services/instagram-webhooks.service';
import { InstagramCommentsService } from '../services/instagram-comments.service';
import { InstagramMessagesService } from '../services/instagram-messages.service';

@Processor('instagram-webhooks')
export class InstagramWebhooksProcessor {
  private readonly logger = new Logger(InstagramWebhooksProcessor.name);

  constructor(
    private webhooksService: InstagramWebhooksService,
    private commentsService: InstagramCommentsService,
    private messagesService: InstagramMessagesService,
  ) {}

  @Process('process-comment')
  async handleComment(job: Job) {
    this.logger.log(`Processing comment webhook ${job.id}`);

    const { eventId, eventData } = job.data;

    try {
      // Process comment through comments service
      await this.commentsService.processWebhookComment(eventData);

      // Mark event as processed
      await this.webhooksService.markEventProcessed(eventId);

      this.logger.log(`Comment webhook processed: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to process comment webhook ${eventId}: ${error.message}`, error.stack);

      await this.webhooksService.markEventFailed(eventId, error.message);

      throw error; // Retry
    }
  }

  @Process('process-mention')
  async handleMention(job: Job) {
    this.logger.log(`Processing mention webhook ${job.id}`);

    const { eventId, eventData } = job.data;

    try {
      // Process mention through comments service
      await this.commentsService.processWebhookMention(eventData);

      await this.webhooksService.markEventProcessed(eventId);

      this.logger.log(`Mention webhook processed: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to process mention webhook ${eventId}: ${error.message}`, error.stack);

      await this.webhooksService.markEventFailed(eventId, error.message);

      throw error;
    }
  }

  @Process('process-story_mention')
  async handleStoryMention(job: Job) {
    this.logger.log(`Processing story mention webhook ${job.id}`);

    const { eventId, eventData } = job.data;

    try {
      // Process story mention
      await this.commentsService.processWebhookStoryMention(eventData);

      await this.webhooksService.markEventProcessed(eventId);

      this.logger.log(`Story mention webhook processed: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to process story mention webhook ${eventId}: ${error.message}`, error.stack);

      await this.webhooksService.markEventFailed(eventId, error.message);

      throw error;
    }
  }

  @Process('process-message')
  async handleMessage(job: Job) {
    this.logger.log(`Processing message webhook ${job.id}`);

    const { eventId, eventData } = job.data;

    try {
      // Process message through messages service
      await this.messagesService.processWebhookMessage(eventData);

      await this.webhooksService.markEventProcessed(eventId);

      this.logger.log(`Message webhook processed: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to process message webhook ${eventId}: ${error.message}`, error.stack);

      await this.webhooksService.markEventFailed(eventId, error.message);

      throw error;
    }
  }

  @Process('process-live_comment')
  async handleLiveComment(job: Job) {
    this.logger.log(`Processing live comment webhook ${job.id}`);

    const { eventId, eventData } = job.data;

    try {
      // Process live comment
      await this.commentsService.processWebhookLiveComment(eventData);

      await this.webhooksService.markEventProcessed(eventId);

      this.logger.log(`Live comment webhook processed: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to process live comment webhook ${eventId}: ${error.message}`, error.stack);

      await this.webhooksService.markEventFailed(eventId, error.message);

      throw error;
    }
  }
}
```

---

### 6. Webhook Configuration in Meta App

```typescript
// Meta App Dashboard Configuration Steps

/**
 * 1. Go to Meta App Dashboard: https://developers.facebook.com/apps/
 * 2. Select your app
 * 3. Navigate to Products > Webhooks
 * 4. Click "Add Subscription" for Instagram
 * 5. Enter callback URL: https://yourdomain.com/api/instagram/webhooks
 * 6. Enter verify token: (from your .env INSTAGRAM_WEBHOOK_VERIFY_TOKEN)
 * 7. Select subscription fields:
 *    - messages
 *    - comments
 *    - mentions
 *    - story_insights
 *    - live_comments (optional)
 * 8. Click "Verify and Save"
 * 9. For each field, click "Subscribe"
 */
```

---

### 7. API Examples

#### Verify Webhook (GET - called by Meta)
```bash
# Meta will call this during setup
GET https://yourdomain.com/api/instagram/webhooks?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING
```

#### Create Webhook Subscription
```bash
curl -X POST "http://localhost:3000/api/instagram/webhooks/subscriptions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "subscriptionFields": ["messages", "comments", "mentions", "story_insights"]
  }'
```

#### Get Webhook Events
```bash
curl -X GET "http://localhost:3000/api/instagram/webhooks/events/550e8400-e29b-41d4-a716-446655440000?processed=false&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Webhook Statistics
```bash
curl -X GET "http://localhost:3000/api/instagram/webhooks/stats/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Retry Failed Events
```bash
curl -X POST "http://localhost:3000/api/instagram/webhooks/retry/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 8. Webhook Payload Examples

#### Comment Event
```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "17841405309211844",
      "time": 1673628492,
      "changes": [
        {
          "field": "comments",
          "value": {
            "from": {
              "id": "17841405822211844",
              "username": "johndoe"
            },
            "media": {
              "id": "18027410234567890",
              "media_product_type": "FEED"
            },
            "comment_id": "18034510236789012",
            "text": "This is amazing!"
          }
        }
      ]
    }
  ]
}
```

#### Message Event
```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "17841405309211844",
      "time": 1673628492,
      "messaging": [
        {
          "sender": {
            "id": "17841405822211844"
          },
          "recipient": {
            "id": "17841405309211844"
          },
          "timestamp": 1673628492000,
          "message": {
            "mid": "aWdfZAG06MTpJR01lc3NhZ2VJRDoxN0lH",
            "text": "Hi, I'm interested in your product"
          }
        }
      ]
    }
  ]
}
```

#### Story Mention Event
```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "17841405309211844",
      "time": 1673628492,
      "changes": [
        {
          "field": "mentions",
          "value": {
            "from": {
              "id": "17841405822211844",
              "username": "janedoe"
            },
            "media": {
              "id": "18027410234567890",
              "media_product_type": "STORY"
            },
            "comment_id": "18034510236789012"
          }
        }
      ]
    }
  ]
}
```

---

### 9. Testing Procedures

#### Unit Tests
```typescript
// src/modules/instagram/services/instagram-webhooks.service.spec.ts

describe('InstagramWebhooksService', () => {
  let service: InstagramWebhooksService;
  let eventRepository: Repository<InstagramWebhookEvent>;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramWebhooksService,
        {
          provide: getRepositoryToken(InstagramWebhookEvent),
          useClass: Repository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'INSTAGRAM_APP_SECRET') return 'test_secret';
              if (key === 'INSTAGRAM_WEBHOOK_VERIFY_TOKEN') return 'test_token';
              return null;
            }),
          },
        },
        {
          provide: 'BullQueue_instagram-webhooks',
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InstagramWebhooksService>(InstagramWebhooksService);
    eventRepository = module.get(getRepositoryToken(InstagramWebhookEvent));
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test_secret';

      const hash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const signature = `sha256=${hash}`;

      const result = service.verifySignature(signature, payload);

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = 'sha256=invalid_hash';

      const result = service.verifySignature(signature, payload);

      expect(result).toBe(false);
    });
  });

  describe('verifySubscription', () => {
    it('should return challenge for valid token', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test_token',
        'hub.challenge': 'challenge_string',
      };

      const result = service.verifySubscription(query);

      expect(result).toBe('challenge_string');
    });

    it('should return null for invalid token', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'challenge_string',
      };

      const result = service.verifySubscription(query);

      expect(result).toBe(null);
    });
  });

  describe('determineEventType', () => {
    it('should identify comment event', () => {
      const change = { field: 'comments', value: {} };
      const type = service['determineEventType'](change);
      expect(type).toBe('comment');
    });

    it('should identify message event', () => {
      const change = { field: 'messages', value: {} };
      const type = service['determineEventType'](change);
      expect(type).toBe('message');
    });

    it('should identify story mention', () => {
      const change = {
        field: 'mentions',
        value: {
          media: { media_product_type: 'STORY' },
        },
      };
      const type = service['determineEventType'](change);
      expect(type).toBe('story_mention');
    });
  });
});
```

#### Integration Tests
```bash
# Test webhook verification
curl -X GET "http://localhost:3000/api/instagram/webhooks?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Should return: test123

# Test webhook processing (simulate Meta sending event)
curl -X POST "http://localhost:3000/api/instagram/webhooks" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=CALCULATED_SIGNATURE" \
  -d '{
    "object": "instagram",
    "entry": [
      {
        "id": "17841405309211844",
        "time": 1673628492,
        "changes": [
          {
            "field": "comments",
            "value": {
              "comment_id": "18034510236789012",
              "text": "Test comment"
            }
          }
        ]
      }
    ]
  }'
```

---

## Acceptance Criteria

### Functional Requirements

1. **Webhook Verification**
   - [ ] GET endpoint handles verification requests
   - [ ] Verify token matches configuration
   - [ ] Returns challenge string on success
   - [ ] Rejects invalid verification attempts
   - [ ] Logs verification attempts

2. **Signature Verification**
   - [ ] Validates X-Hub-Signature-256 header
   - [ ] Uses HMAC SHA256 with app secret
   - [ ] Rejects requests with invalid signatures
   - [ ] Uses constant-time comparison
   - [ ] Logs signature verification failures

3. **Event Processing**
   - [ ] Handles comment events
   - [ ] Handles mention events
   - [ ] Handles message events
   - [ ] Handles story mention events
   - [ ] Handles live comment events
   - [ ] Extracts event data correctly
   - [ ] Generates unique event IDs

4. **Duplicate Detection**
   - [ ] Detects duplicate events by event ID
   - [ ] Marks duplicates in database
   - [ ] Links duplicates to original event
   - [ ] Prevents duplicate processing
   - [ ] Logs duplicate occurrences

5. **Queue Processing**
   - [ ] Events queued to BullMQ
   - [ ] Separate job types by event type
   - [ ] Job retry with exponential backoff
   - [ ] Maximum 3 retry attempts
   - [ ] Failed jobs logged with errors

6. **Event Storage**
   - [ ] All events saved to database
   - [ ] Event type correctly identified
   - [ ] Sender information extracted
   - [ ] Full payload stored as JSONB
   - [ ] Timestamps recorded accurately

7. **Subscription Management**
   - [ ] Create webhook subscriptions
   - [ ] Store subscription configuration
   - [ ] Track subscription statistics
   - [ ] Update last event received time
   - [ ] Count events received

### Technical Requirements

8. **Database**
   - [ ] Webhook events table with indexes
   - [ ] Webhook subscriptions table
   - [ ] Webhook logs table
   - [ ] Unique constraint on event_id
   - [ ] Foreign key to Instagram accounts
   - [ ] JSONB payload storage

9. **Performance**
   - [ ] Webhook processing < 500ms
   - [ ] Signature verification < 50ms
   - [ ] Event deduplication < 100ms
   - [ ] Database queries optimized
   - [ ] Async processing via queues

10. **Security**
    - [ ] Signature verification mandatory
    - [ ] Constant-time signature comparison
    - [ ] App secret from environment variable
    - [ ] Verify token from environment variable
    - [ ] No sensitive data in logs

11. **Error Handling**
    - [ ] Invalid signatures rejected
    - [ ] Malformed payloads handled
    - [ ] Database errors caught
    - [ ] Queue errors logged
    - [ ] Retry logic for failures

12. **Monitoring**
    - [ ] Log all webhook events
    - [ ] Log signature verification attempts
    - [ ] Log processing errors
    - [ ] Track event statistics
    - [ ] Alert on high failure rates

### Quality Requirements

13. **Reliability**
    - [ ] 99.9% webhook processing success
    - [ ] Zero duplicate processing
    - [ ] All events stored before processing
    - [ ] Failed events can be retried
    - [ ] Dead letter queue for permanent failures

14. **Validation**
    - [ ] Webhook payload structure validated
    - [ ] Event type validation
    - [ ] Account ID validation
    - [ ] Sender ID validation

15. **Documentation**
    - [ ] API endpoints documented
    - [ ] Webhook setup guide
    - [ ] Event payload examples
    - [ ] Troubleshooting guide
    - [ ] curl examples for testing

16. **Testing**
    - [ ] Unit tests for signature verification
    - [ ] Unit tests for event type detection
    - [ ] Unit tests for duplicate detection
    - [ ] Integration tests for webhook flow
    - [ ] E2E tests with sample payloads

17. **Logging**
    - [ ] All events logged with context
    - [ ] Errors logged with stack traces
    - [ ] Webhook logs stored in database
    - [ ] Log levels appropriately used
    - [ ] Sensitive data excluded from logs

### User Experience

18. **Statistics & Monitoring**
    - [ ] View webhook events by account
    - [ ] Filter events by type/status
    - [ ] View event statistics
    - [ ] Track processing success rate
    - [ ] Identify failed events

19. **Retry Mechanism**
    - [ ] Manual retry of failed events
    - [ ] Automatic retry with backoff
    - [ ] Retry limit enforcement
    - [ ] Retry status tracking
    - [ ] Retry logs maintained

20. **Maintenance**
    - [ ] Easy webhook subscription setup
    - [ ] Clear error messages
    - [ ] Event history retention
    - [ ] Database cleanup scripts
    - [ ] Configuration via environment

---

## Dependencies

- **IG-001**: Instagram OAuth (for account data)
- **IG-002**: Instagram account connection
- **IG-003**: Instagram comments (for comment processing)
- **IG-004**: Instagram messages (for message processing)
- **Database**: PostgreSQL
- **Queue**: BullMQ + Redis
- **Meta App**: Configured with webhook subscriptions

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/instagram/webhooks` | Webhook verification (Meta calls) |
| POST | `/instagram/webhooks` | Webhook events (Meta calls) |
| POST | `/instagram/webhooks/subscriptions` | Create subscription |
| GET | `/instagram/webhooks/events/:accountId` | Get events |
| GET | `/instagram/webhooks/stats/:accountId` | Get statistics |
| POST | `/instagram/webhooks/retry/:accountId` | Retry failed events |

---

## Environment Variables

```bash
# Instagram App
INSTAGRAM_APP_SECRET=your_app_secret_here
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_random_verify_token

# Application
APP_BASE_URL=https://yourdomain.com

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Webhook Setup Guide

### 1. Configure Meta App
```
1. Go to https://developers.facebook.com/apps/
2. Select your app → Products → Webhooks
3. Add Instagram subscription
4. Callback URL: https://yourdomain.com/api/instagram/webhooks
5. Verify Token: [YOUR_TOKEN_FROM_ENV]
6. Subscribe to: messages, comments, mentions, story_insights
```

### 2. Test Webhook
```bash
# Test verification
curl "https://yourdomain.com/api/instagram/webhooks?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Should return: test123
```

### 3. Monitor Events
```bash
# Check event statistics
curl "http://localhost:3000/api/instagram/webhooks/stats/ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

- Webhooks must respond within 20 seconds or Meta will retry
- Events may be delivered multiple times (implement idempotency)
- Signature verification is mandatory for security
- Store all events before processing (for retry/debugging)
- Use queues for async processing to respond quickly
- Webhook URL must be HTTPS in production
- Test webhooks with Meta's test events feature

---

## Estimated Effort

- **Database Design & Migrations**: 3 hours
- **DTOs & Validation**: 2 hours
- **Service Implementation**: 8 hours
- **Controller Implementation**: 2 hours
- **Signature Verification**: 2 hours
- **Queue Processing**: 4 hours
- **Testing**: 6 hours
- **Documentation**: 2 hours
- **Total**: ~29 hours (8 story points)
