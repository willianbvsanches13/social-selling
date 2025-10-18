# WORKER-002: Instagram Webhook Processing Worker

## Epic
Background Workers & Job Processing

## Story
As a system administrator, I need a reliable background worker that processes Instagram webhook events (comments, mentions, messages, stories) from a queue, detects duplicates, normalizes event data, updates the database, triggers notifications, and implements auto-reply logic for common scenarios.

## Priority
P0 - Critical

## Estimated Effort
13 Story Points (Large)

## Dependencies
- Instagram webhook endpoint configured (IG-005)
- PostgreSQL database with webhook events table
- Redis for BullMQ
- BullMQ library installed
- Notification system setup

## Technical Context

### Technology Stack
- **Queue System**: BullMQ 5.x with Redis
- **Worker Runtime**: Node.js 20.x with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Instagram API**: Meta Graph API v18.0 for responses
- **Caching**: Redis for duplicate detection
- **Logging**: Winston/Pino
- **Monitoring**: Bull Board UI

### Architecture Overview
```
┌─────────────────┐
│  Instagram      │
│  Platform       │
└────────┬────────┘
         │ Webhook POST
         ▼
┌─────────────────┐
│  NestJS         │
│  Webhook        │
│  Endpoint       │
└────────┬────────┘
         │ Add to Queue
         ▼
┌─────────────────┐
│  Redis Queue    │
│  (BullMQ)       │
└────────┬────────┘
         │ Process
         ▼
┌─────────────────┐
│ Webhook         │
│ Processor       │
└────┬───┬───┬────┘
     │   │   │
     │   │   └──────────────┐
     │   │                  │
     ▼   ▼                  ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│Database│  │Auto-Reply│  │  Notify  │
└────────┘  └──────────┘  └──────────┘
```

### Webhook Event Types
- **comments**: New comments on posts
- **mentions**: Mentions in stories or posts
- **messages**: Direct messages
- **story_insights**: Story interactions
- **live_comments**: Live video comments

### Queue Design
- **Queue Name**: `instagram-webhook-events`
- **Concurrency**: 5 workers
- **Priority**: High priority for messages, normal for others
- **Retry Strategy**: Max 3 attempts with exponential backoff
- **Job Timeout**: 30 seconds per job
- **Duplicate Detection**: 5-minute window using Redis

## Detailed Requirements

### 1. BullMQ Queue Configuration

#### Queue Setup Module
```typescript
// src/workers/queues/webhook-events.queue.ts

import { Queue, QueueOptions } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum WebhookEventType {
  COMMENT = 'comment',
  MENTION = 'mention',
  MESSAGE = 'message',
  STORY_INSIGHT = 'story_insight',
  LIVE_COMMENT = 'live_comment',
}

export interface WebhookEventJobData {
  eventId: string;
  eventType: WebhookEventType;
  instagramAccountId: string;
  userId: string;
  rawPayload: any;
  receivedAt: Date;
  metadata: {
    sourceIp?: string;
    userAgent?: string;
  };
}

export interface WebhookEventJobResult {
  success: boolean;
  eventId: string;
  processed: boolean;
  duplicate?: boolean;
  actions: {
    databaseUpdate: boolean;
    notificationSent: boolean;
    autoReplySent: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

@Injectable()
export class WebhookEventsQueue {
  private queue: Queue<WebhookEventJobData, WebhookEventJobResult>;

  constructor(private configService: ConfigService) {
    this.initializeQueue();
  }

  private initializeQueue() {
    const queueOptions: QueueOptions = {
      connection: {
        host: this.configService.get('REDIS_HOST'),
        port: this.configService.get('REDIS_PORT'),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds base delay
        },
        removeOnComplete: {
          count: 5000,
          age: 172800, // 48 hours
        },
        removeOnFail: {
          count: 10000,
          age: 604800, // 7 days
        },
      },
    };

    this.queue = new Queue<WebhookEventJobData, WebhookEventJobResult>(
      'instagram-webhook-events',
      queueOptions,
    );
  }

  async addEvent(
    data: WebhookEventJobData,
    priority?: number,
  ) {
    const jobId = `webhook-${data.eventType}-${data.eventId}`;

    // Higher priority for messages
    const jobPriority = priority || (data.eventType === WebhookEventType.MESSAGE ? 1 : 10);

    return this.queue.add(
      'process-webhook',
      data,
      {
        jobId,
        priority: jobPriority,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async getEventStatus(eventId: string, eventType: WebhookEventType) {
    const jobId = `webhook-${eventType}-${eventId}`;
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  getQueue() {
    return this.queue;
  }
}
```

### 2. Duplicate Detection Service

#### Event Deduplication
```typescript
// src/workers/services/event-deduplication.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { WebhookEventType } from '../queues/webhook-events.queue';
import * as crypto from 'crypto';

@Injectable()
export class EventDeduplicationService {
  private readonly logger = new Logger(EventDeduplicationService.name);
  private readonly DEDUP_WINDOW = 300; // 5 minutes in seconds
  private readonly KEY_PREFIX = 'webhook:dedup:';

  constructor(private redis: RedisService) {}

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

      // Store key with expiration
      await this.redis.setex(dedupKey, this.DEDUP_WINDOW, '1');

      return false;

    } catch (error) {
      this.logger.error(`Error checking duplicate: ${error.message}`, error.stack);
      // On error, allow processing to continue
      return false;
    }
  }

  private createDedupKey(
    eventType: WebhookEventType,
    eventId: string,
    payload: any,
  ): string {
    // Create hash of critical payload fields for deduplication
    const criticalFields = this.extractCriticalFields(eventType, payload);
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(criticalFields))
      .digest('hex')
      .substring(0, 16);

    return `${this.KEY_PREFIX}${eventType}:${eventId}:${hash}`;
  }

  private extractCriticalFields(eventType: WebhookEventType, payload: any): any {
    switch (eventType) {
      case WebhookEventType.COMMENT:
        return {
          commentId: payload.id,
          text: payload.text,
          timestamp: payload.timestamp,
          from: payload.from?.id,
        };

      case WebhookEventType.MENTION:
        return {
          mediaId: payload.media_id,
          commentId: payload.comment_id,
          timestamp: payload.timestamp,
        };

      case WebhookEventType.MESSAGE:
        return {
          messageId: payload.id,
          text: payload.message?.text,
          timestamp: payload.timestamp,
          from: payload.from?.id,
        };

      case WebhookEventType.STORY_INSIGHT:
        return {
          mediaId: payload.media_id,
          metric: payload.metric,
          value: payload.value,
          timestamp: payload.timestamp,
        };

      default:
        return payload;
    }
  }

  async markAsProcessed(
    eventType: WebhookEventType,
    eventId: string,
  ): Promise<void> {
    const key = `${this.KEY_PREFIX}processed:${eventType}:${eventId}`;
    await this.redis.setex(key, this.DEDUP_WINDOW * 2, '1');
  }

  async wasProcessed(
    eventType: WebhookEventType,
    eventId: string,
  ): Promise<boolean> {
    const key = `${this.KEY_PREFIX}processed:${eventType}:${eventId}`;
    return await this.redis.exists(key);
  }
}
```

### 3. Event Normalization Service

#### Data Normalization
```typescript
// src/workers/services/event-normalizer.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventType } from '../queues/webhook-events.queue';

export interface NormalizedComment {
  id: string;
  text: string;
  timestamp: Date;
  from: {
    id: string;
    username: string;
  };
  media: {
    id: string;
    type: string;
  };
  parentId?: string;
  likeCount?: number;
  isHidden?: boolean;
}

export interface NormalizedMention {
  id: string;
  mediaId: string;
  commentId?: string;
  timestamp: Date;
  mentionedIn: 'story' | 'post' | 'comment';
  from: {
    id: string;
    username: string;
  };
}

export interface NormalizedMessage {
  id: string;
  text?: string;
  attachments?: Array<{
    type: string;
    url: string;
  }>;
  timestamp: Date;
  from: {
    id: string;
    username?: string;
  };
  conversationId: string;
  isEcho?: boolean;
}

export interface NormalizedStoryInsight {
  mediaId: string;
  metric: string;
  value: number;
  timestamp: Date;
}

export type NormalizedEvent =
  | NormalizedComment
  | NormalizedMention
  | NormalizedMessage
  | NormalizedStoryInsight;

@Injectable()
export class EventNormalizerService {
  private readonly logger = new Logger(EventNormalizerService.name);

  normalizeEvent(eventType: WebhookEventType, rawPayload: any): NormalizedEvent {
    try {
      switch (eventType) {
        case WebhookEventType.COMMENT:
          return this.normalizeComment(rawPayload);

        case WebhookEventType.MENTION:
          return this.normalizeMention(rawPayload);

        case WebhookEventType.MESSAGE:
          return this.normalizeMessage(rawPayload);

        case WebhookEventType.STORY_INSIGHT:
          return this.normalizeStoryInsight(rawPayload);

        default:
          throw new Error(`Unknown event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to normalize event: ${error.message}`, error.stack);
      throw error;
    }
  }

  private normalizeComment(payload: any): NormalizedComment {
    return {
      id: payload.id || payload.comment_id,
      text: payload.text || '',
      timestamp: new Date(payload.timestamp * 1000),
      from: {
        id: payload.from?.id || '',
        username: payload.from?.username || 'unknown',
      },
      media: {
        id: payload.media?.id || payload.media_id,
        type: payload.media?.media_type || 'unknown',
      },
      parentId: payload.parent_id,
      likeCount: payload.like_count || 0,
      isHidden: payload.is_hidden || false,
    };
  }

  private normalizeMention(payload: any): NormalizedMention {
    let mentionedIn: 'story' | 'post' | 'comment' = 'post';

    if (payload.media?.media_product_type === 'STORY') {
      mentionedIn = 'story';
    } else if (payload.comment_id) {
      mentionedIn = 'comment';
    }

    return {
      id: payload.id,
      mediaId: payload.media_id,
      commentId: payload.comment_id,
      timestamp: new Date(payload.timestamp * 1000),
      mentionedIn,
      from: {
        id: payload.from?.id || '',
        username: payload.from?.username || 'unknown',
      },
    };
  }

  private normalizeMessage(payload: any): NormalizedMessage {
    const attachments = [];

    if (payload.attachments) {
      for (const attachment of payload.attachments) {
        attachments.push({
          type: attachment.type,
          url: attachment.payload?.url || '',
        });
      }
    }

    return {
      id: payload.id || payload.mid,
      text: payload.message?.text || payload.text,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: new Date(payload.timestamp * 1000),
      from: {
        id: payload.from?.id || payload.sender?.id || '',
        username: payload.from?.username || payload.sender?.username,
      },
      conversationId: payload.conversation_id || payload.recipient?.id || '',
      isEcho: payload.is_echo || false,
    };
  }

  private normalizeStoryInsight(payload: any): NormalizedStoryInsight {
    return {
      mediaId: payload.media_id,
      metric: payload.metric,
      value: parseInt(payload.value, 10) || 0,
      timestamp: new Date(payload.timestamp * 1000),
    };
  }

  validateNormalizedEvent(event: NormalizedEvent, eventType: WebhookEventType): boolean {
    switch (eventType) {
      case WebhookEventType.COMMENT:
        const comment = event as NormalizedComment;
        return !!(comment.id && comment.text && comment.from.id);

      case WebhookEventType.MENTION:
        const mention = event as NormalizedMention;
        return !!(mention.id && mention.mediaId && mention.from.id);

      case WebhookEventType.MESSAGE:
        const message = event as NormalizedMessage;
        return !!(message.id && message.from.id);

      case WebhookEventType.STORY_INSIGHT:
        const insight = event as NormalizedStoryInsight;
        return !!(insight.mediaId && insight.metric && insight.value >= 0);

      default:
        return false;
    }
  }
}
```

### 4. Auto-Reply Service

#### Automated Responses
```typescript
// src/workers/services/auto-reply.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  NormalizedComment,
  NormalizedMessage,
} from './event-normalizer.service';

export interface AutoReplyRule {
  id: string;
  trigger: 'keyword' | 'question' | 'greeting' | 'away';
  pattern: string | RegExp;
  response: string;
  enabled: boolean;
  priority: number;
}

export interface AutoReplyResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class AutoReplyService {
  private readonly logger = new Logger(AutoReplyService.name);
  private readonly graphApiVersion = 'v18.0';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async shouldAutoReply(
    accountId: string,
    text: string,
    eventType: 'comment' | 'message',
  ): Promise<{ should: boolean; rule?: AutoReplyRule }> {
    try {
      // Check if auto-reply is enabled for account
      const account = await this.prisma.instagramAccount.findUnique({
        where: { id: accountId },
        select: { autoReplyEnabled: true },
      });

      if (!account?.autoReplyEnabled) {
        return { should: false };
      }

      // Get active auto-reply rules for account
      const rules = await this.getAutoReplyRules(accountId, eventType);

      // Find matching rule
      const matchingRule = this.findMatchingRule(text, rules);

      if (matchingRule) {
        return { should: true, rule: matchingRule };
      }

      return { should: false };

    } catch (error) {
      this.logger.error(`Error checking auto-reply: ${error.message}`, error.stack);
      return { should: false };
    }
  }

  async replyToComment(
    comment: NormalizedComment,
    replyText: string,
    accessToken: string,
  ): Promise<AutoReplyResult> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/${this.graphApiVersion}/${comment.id}/replies`,
        {
          message: replyText,
        },
        {
          params: {
            access_token: accessToken,
          },
        },
      );

      this.logger.log(`Auto-replied to comment ${comment.id}`);

      return {
        sent: true,
        messageId: response.data.id,
      };

    } catch (error) {
      this.logger.error(`Failed to reply to comment: ${error.message}`, error.stack);
      return {
        sent: false,
        error: error.message,
      };
    }
  }

  async replyToMessage(
    message: NormalizedMessage,
    replyText: string,
    igAccountId: string,
    accessToken: string,
  ): Promise<AutoReplyResult> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/${this.graphApiVersion}/${igAccountId}/messages`,
        {
          recipient: {
            id: message.from.id,
          },
          message: {
            text: replyText,
          },
        },
        {
          params: {
            access_token: accessToken,
          },
        },
      );

      this.logger.log(`Auto-replied to message ${message.id}`);

      return {
        sent: true,
        messageId: response.data.message_id,
      };

    } catch (error) {
      this.logger.error(`Failed to reply to message: ${error.message}`, error.stack);
      return {
        sent: false,
        error: error.message,
      };
    }
  }

  private async getAutoReplyRules(
    accountId: string,
    eventType: 'comment' | 'message',
  ): Promise<AutoReplyRule[]> {
    const rules = await this.prisma.autoReplyRule.findMany({
      where: {
        accountId,
        eventType,
        enabled: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    return rules.map(rule => ({
      id: rule.id,
      trigger: rule.trigger as any,
      pattern: rule.isRegex ? new RegExp(rule.pattern, 'i') : rule.pattern,
      response: rule.response,
      enabled: rule.enabled,
      priority: rule.priority,
    }));
  }

  private findMatchingRule(text: string, rules: AutoReplyRule[]): AutoReplyRule | null {
    const lowerText = text.toLowerCase().trim();

    for (const rule of rules) {
      switch (rule.trigger) {
        case 'keyword':
          if (this.matchKeyword(lowerText, rule.pattern)) {
            return rule;
          }
          break;

        case 'question':
          if (this.isQuestion(lowerText)) {
            return rule;
          }
          break;

        case 'greeting':
          if (this.isGreeting(lowerText)) {
            return rule;
          }
          break;

        case 'away':
          // Away messages always match
          return rule;
      }
    }

    return null;
  }

  private matchKeyword(text: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(text);
    }

    return text.includes(pattern.toLowerCase());
  }

  private isQuestion(text: string): boolean {
    const questionWords = ['what', 'when', 'where', 'why', 'who', 'how', 'is', 'are', 'can', 'could', 'would'];
    const hasQuestionWord = questionWords.some(word => text.startsWith(word));
    const hasQuestionMark = text.includes('?');

    return hasQuestionWord || hasQuestionMark;
  }

  private isGreeting(text: string): boolean {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => text.startsWith(greeting));
  }

  async logAutoReply(
    accountId: string,
    eventId: string,
    ruleId: string,
    replyMessageId: string,
  ): Promise<void> {
    await this.prisma.autoReplyLog.create({
      data: {
        accountId,
        eventId,
        ruleId,
        replyMessageId,
        sentAt: new Date(),
      },
    });
  }
}
```

### 5. Event Processor Implementation

#### Main Webhook Processor
```typescript
// src/workers/processors/webhook-events.processor.ts

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventDeduplicationService } from '../services/event-deduplication.service';
import { EventNormalizerService } from '../services/event-normalizer.service';
import { AutoReplyService } from '../services/auto-reply.service';
import { NotificationService } from '@/notifications/notification.service';
import {
  WebhookEventJobData,
  WebhookEventJobResult,
  WebhookEventType,
} from '../queues/webhook-events.queue';

@Processor('instagram-webhook-events', {
  concurrency: 5,
  limiter: {
    max: 50,
    duration: 1000, // 50 events per second
  },
})
@Injectable()
export class WebhookEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookEventsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private deduplication: EventDeduplicationService,
    private normalizer: EventNormalizerService,
    private autoReply: AutoReplyService,
    private notification: NotificationService,
  ) {
    super();
  }

  async process(job: Job<WebhookEventJobData, WebhookEventJobResult>): Promise<WebhookEventJobResult> {
    const { eventId, eventType, instagramAccountId, userId, rawPayload } = job.data;

    this.logger.log(`Processing webhook event: ${eventType}:${eventId}`);

    const result: WebhookEventJobResult = {
      success: false,
      eventId,
      processed: false,
      actions: {
        databaseUpdate: false,
        notificationSent: false,
        autoReplySent: false,
      },
    };

    try {
      // Step 1: Check for duplicates
      await job.updateProgress(10);
      const isDuplicate = await this.deduplication.isDuplicate(
        eventType,
        eventId,
        rawPayload,
      );

      if (isDuplicate) {
        this.logger.warn(`Skipping duplicate event: ${eventType}:${eventId}`);
        result.duplicate = true;
        result.success = true;
        return result;
      }

      // Step 2: Normalize event data
      await job.updateProgress(20);
      const normalizedEvent = this.normalizer.normalizeEvent(eventType, rawPayload);

      // Validate normalized data
      const isValid = this.normalizer.validateNormalizedEvent(normalizedEvent, eventType);
      if (!isValid) {
        throw new Error('Event normalization validation failed');
      }

      await job.updateProgress(30);

      // Step 3: Process based on event type
      switch (eventType) {
        case WebhookEventType.COMMENT:
          await this.processComment(normalizedEvent, instagramAccountId, userId, result);
          break;

        case WebhookEventType.MENTION:
          await this.processMention(normalizedEvent, instagramAccountId, userId, result);
          break;

        case WebhookEventType.MESSAGE:
          await this.processMessage(normalizedEvent, instagramAccountId, userId, result);
          break;

        case WebhookEventType.STORY_INSIGHT:
          await this.processStoryInsight(normalizedEvent, instagramAccountId, result);
          break;
      }

      await job.updateProgress(90);

      // Step 4: Mark as processed
      await this.deduplication.markAsProcessed(eventType, eventId);

      await job.updateProgress(100);

      result.success = true;
      result.processed = true;

      this.logger.log(`Successfully processed event: ${eventType}:${eventId}`);

      return result;

    } catch (error) {
      this.logger.error(
        `Failed to process event ${eventType}:${eventId}: ${error.message}`,
        error.stack,
      );

      result.error = {
        code: error.code || 'PROCESSING_ERROR',
        message: error.message,
      };

      return result;
    }
  }

  private async processComment(
    comment: any,
    accountId: string,
    userId: string,
    result: WebhookEventJobResult,
  ): Promise<void> {
    // Save to database
    await this.prisma.instagramComment.create({
      data: {
        id: comment.id,
        text: comment.text,
        timestamp: comment.timestamp,
        fromId: comment.from.id,
        fromUsername: comment.from.username,
        mediaId: comment.media.id,
        accountId,
        parentId: comment.parentId,
        likeCount: comment.likeCount,
        isHidden: comment.isHidden,
        rawData: comment,
      },
    });
    result.actions.databaseUpdate = true;

    // Check for auto-reply
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: accountId },
      select: { accessToken: true, instagramBusinessAccountId: true },
    });

    const { should, rule } = await this.autoReply.shouldAutoReply(
      accountId,
      comment.text,
      'comment',
    );

    if (should && rule && account) {
      const replyResult = await this.autoReply.replyToComment(
        comment,
        rule.response,
        account.accessToken,
      );

      if (replyResult.sent) {
        result.actions.autoReplySent = true;
        await this.autoReply.logAutoReply(
          accountId,
          comment.id,
          rule.id,
          replyResult.messageId!,
        );
      }
    }

    // Send notification
    await this.notification.sendCommentNotification(userId, comment);
    result.actions.notificationSent = true;
  }

  private async processMention(
    mention: any,
    accountId: string,
    userId: string,
    result: WebhookEventJobResult,
  ): Promise<void> {
    // Save to database
    await this.prisma.instagramMention.create({
      data: {
        id: mention.id,
        mediaId: mention.mediaId,
        commentId: mention.commentId,
        timestamp: mention.timestamp,
        mentionedIn: mention.mentionedIn,
        fromId: mention.from.id,
        fromUsername: mention.from.username,
        accountId,
        rawData: mention,
      },
    });
    result.actions.databaseUpdate = true;

    // Send notification
    await this.notification.sendMentionNotification(userId, mention);
    result.actions.notificationSent = true;
  }

  private async processMessage(
    message: any,
    accountId: string,
    userId: string,
    result: WebhookEventJobResult,
  ): Promise<void> {
    // Skip echo messages (messages sent by us)
    if (message.isEcho) {
      this.logger.debug(`Skipping echo message: ${message.id}`);
      return;
    }

    // Save to database
    await this.prisma.instagramMessage.create({
      data: {
        id: message.id,
        text: message.text,
        timestamp: message.timestamp,
        fromId: message.from.id,
        fromUsername: message.from.username,
        conversationId: message.conversationId,
        accountId,
        attachments: message.attachments,
        rawData: message,
      },
    });
    result.actions.databaseUpdate = true;

    // Update conversation last activity
    await this.prisma.instagramConversation.upsert({
      where: {
        accountId_participantId: {
          accountId,
          participantId: message.from.id,
        },
      },
      create: {
        accountId,
        participantId: message.from.id,
        participantUsername: message.from.username,
        lastMessageAt: message.timestamp,
        unreadCount: 1,
      },
      update: {
        lastMessageAt: message.timestamp,
        unreadCount: { increment: 1 },
      },
    });

    // Check for auto-reply
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: accountId },
      select: { accessToken: true, instagramBusinessAccountId: true },
    });

    const { should, rule } = await this.autoReply.shouldAutoReply(
      accountId,
      message.text || '',
      'message',
    );

    if (should && rule && account) {
      const replyResult = await this.autoReply.replyToMessage(
        message,
        rule.response,
        account.instagramBusinessAccountId,
        account.accessToken,
      );

      if (replyResult.sent) {
        result.actions.autoReplySent = true;
        await this.autoReply.logAutoReply(
          accountId,
          message.id,
          rule.id,
          replyResult.messageId!,
        );
      }
    }

    // Send notification (high priority for messages)
    await this.notification.sendMessageNotification(userId, message);
    result.actions.notificationSent = true;
  }

  private async processStoryInsight(
    insight: any,
    accountId: string,
    result: WebhookEventJobResult,
  ): Promise<void> {
    // Save to database
    await this.prisma.instagramStoryInsight.create({
      data: {
        mediaId: insight.mediaId,
        metric: insight.metric,
        value: insight.value,
        timestamp: insight.timestamp,
        accountId,
      },
    });
    result.actions.databaseUpdate = true;

    // Update story metrics
    await this.prisma.instagramStory.update({
      where: {
        accountId_mediaId: {
          accountId,
          mediaId: insight.mediaId,
        },
      },
      data: {
        [`${insight.metric}`]: insight.value,
      },
    });
  }

  @OnWorkerEvent('active')
  onActive(job: Job<WebhookEventJobData>) {
    this.logger.log(
      `Processing webhook event: ${job.data.eventType}:${job.data.eventId}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<WebhookEventJobData>, result: WebhookEventJobResult) {
    if (result.duplicate) {
      this.logger.debug(`Duplicate event: ${job.data.eventType}:${job.data.eventId}`);
    } else {
      this.logger.log(
        `Event processed: ${job.data.eventType}:${job.data.eventId} - Success: ${result.success}`,
      );
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<WebhookEventJobData>, error: Error) {
    this.logger.error(
      `Event processing failed: ${job.data.eventType}:${job.data.eventId} - ${error.message}`,
      error.stack,
    );
  }
}
```

### 6. Event Analytics Service

#### Analytics Tracking
```typescript
// src/workers/services/event-analytics.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  processingRate: number;
  averageProcessingTime: number;
  duplicateRate: number;
  autoReplyRate: number;
}

@Injectable()
export class EventAnalyticsService {
  private readonly logger = new Logger(EventAnalyticsService.name);
  private readonly METRICS_KEY = 'webhook:metrics';
  private readonly METRICS_TTL = 86400; // 24 hours

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async trackEvent(
    eventType: string,
    processingTime: number,
    isDuplicate: boolean,
    autoReplySent: boolean,
  ): Promise<void> {
    const key = `${this.METRICS_KEY}:${this.getDateKey()}`;

    const pipeline = this.redis.pipeline();

    // Increment counters
    pipeline.hincrby(key, 'total', 1);
    pipeline.hincrby(key, `type:${eventType}`, 1);
    pipeline.hincrby(key, 'processing_time', processingTime);

    if (isDuplicate) {
      pipeline.hincrby(key, 'duplicates', 1);
    }

    if (autoReplySent) {
      pipeline.hincrby(key, 'auto_replies', 1);
    }

    // Set expiration
    pipeline.expire(key, this.METRICS_TTL);

    await pipeline.exec();
  }

  async getMetrics(date?: Date): Promise<EventMetrics> {
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
  }

  private getDateKey(): string {
    return this.formatDate(new Date());
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async getEventStats(accountId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.prisma.$queryRaw`
      SELECT
        'comments' as event_type,
        COUNT(*) as count,
        DATE_TRUNC('day', timestamp) as date
      FROM instagram_comments
      WHERE account_id = ${accountId} AND timestamp >= ${since}
      GROUP BY DATE_TRUNC('day', timestamp)

      UNION ALL

      SELECT
        'mentions' as event_type,
        COUNT(*) as count,
        DATE_TRUNC('day', timestamp) as date
      FROM instagram_mentions
      WHERE account_id = ${accountId} AND timestamp >= ${since}
      GROUP BY DATE_TRUNC('day', timestamp)

      UNION ALL

      SELECT
        'messages' as event_type,
        COUNT(*) as count,
        DATE_TRUNC('day', timestamp) as date
      FROM instagram_messages
      WHERE account_id = ${accountId} AND timestamp >= ${since}
      GROUP BY DATE_TRUNC('day', timestamp)

      ORDER BY date DESC
    `;

    return stats;
  }
}
```

### 7. Module Configuration

#### Webhook Worker Module
```typescript
// src/workers/webhook-workers.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/redis/redis.module';
import { NotificationsModule } from '@/notifications/notifications.module';

import { WebhookEventsQueue } from './queues/webhook-events.queue';
import { WebhookEventsProcessor } from './processors/webhook-events.processor';
import { EventDeduplicationService } from './services/event-deduplication.service';
import { EventNormalizerService } from './services/event-normalizer.service';
import { AutoReplyService } from './services/auto-reply.service';
import { EventAnalyticsService } from './services/event-analytics.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    NotificationsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'instagram-webhook-events',
    }),
  ],
  providers: [
    WebhookEventsQueue,
    WebhookEventsProcessor,
    EventDeduplicationService,
    EventNormalizerService,
    AutoReplyService,
    EventAnalyticsService,
  ],
  exports: [
    WebhookEventsQueue,
    EventDeduplicationService,
    EventNormalizerService,
    AutoReplyService,
    EventAnalyticsService,
  ],
})
export class WebhookWorkersModule {}
```

## Testing Requirements

### Unit Tests
```typescript
// src/workers/processors/webhook-events.processor.spec.ts

describe('WebhookEventsProcessor', () => {
  let processor: WebhookEventsProcessor;
  let deduplication: EventDeduplicationService;
  let normalizer: EventNormalizerService;
  let autoReply: AutoReplyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookEventsProcessor,
        // Mock providers
      ],
    }).compile();

    processor = module.get<WebhookEventsProcessor>(WebhookEventsProcessor);
  });

  describe('process', () => {
    it('should detect and skip duplicate events', async () => {
      // Test implementation
    });

    it('should normalize comment events correctly', async () => {
      // Test implementation
    });

    it('should trigger auto-reply for matching keywords', async () => {
      // Test implementation
    });

    it('should send notifications for new messages', async () => {
      // Test implementation
    });

    it('should update conversation unread count', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests
```typescript
// src/workers/integration/webhook.integration.spec.ts

describe('Webhook Processing Integration', () => {
  it('should process complete webhook workflow', async () => {
    // 1. Receive webhook
    // 2. Add to queue
    // 3. Process event
    // 4. Verify database update
    // 5. Verify notification sent
  });

  it('should handle high volume of events', async () => {
    // Test with 1000+ events
  });
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] BullMQ queue configured with Redis connection
- [ ] Queue accepts all webhook event types
- [ ] Worker processes events with concurrency of 5
- [ ] Duplicate events detected within 5-minute window
- [ ] Duplicate events skipped without processing
- [ ] Comment events normalized and saved to database
- [ ] Mention events normalized and saved to database
- [ ] Message events normalized and saved to database
- [ ] Story insight events normalized and saved to database
- [ ] Auto-reply triggers on keyword matches
- [ ] Auto-reply triggers on questions
- [ ] Auto-reply triggers on greetings
- [ ] Comment replies sent via Instagram API
- [ ] Message replies sent via Instagram API
- [ ] Auto-reply logs created for tracking
- [ ] Notifications sent for new comments
- [ ] Notifications sent for new mentions
- [ ] High-priority notifications for messages
- [ ] Conversation unread count incremented
- [ ] Event analytics tracked in Redis
- [ ] Event stats queryable by date range

### Error Handling Requirements
- [ ] Invalid event payloads logged and skipped
- [ ] Network errors trigger retry (max 3 attempts)
- [ ] Database errors logged but don't block queue
- [ ] Notification failures don't block event processing
- [ ] Auto-reply failures logged but don't fail job
- [ ] Malformed events rejected with clear error

### Performance Requirements
- [ ] Worker processes 50 events per second
- [ ] Duplicate check completes in <10ms
- [ ] Event normalization completes in <50ms
- [ ] Database updates complete in <200ms
- [ ] Auto-reply check completes in <100ms
- [ ] Total processing time <500ms per event
- [ ] Queue lag stays under 1 second under normal load

### Monitoring Requirements
- [ ] All event types tracked in metrics
- [ ] Duplicate rate monitored
- [ ] Auto-reply rate monitored
- [ ] Processing time tracked per event type
- [ ] Failed jobs logged with full context
- [ ] Queue depth monitored
- [ ] Worker health checks implemented

## Documentation Requirements

### Code Documentation
- All services documented with JSDoc
- Event schemas documented
- Auto-reply rules documented
- Normalization logic explained

### Operational Documentation
- Worker deployment guide
- Auto-reply configuration guide
- Event analytics dashboard setup
- Troubleshooting guide

## Future Enhancements
- AI-powered auto-reply using GPT
- Sentiment analysis for comments/messages
- Spam detection and filtering
- Conversation threading
- Multi-language support for auto-replies
- Advanced analytics with ML insights

## Related Tasks
- IG-005: Instagram Webhook Endpoint
- WORKER-001: Instagram Post Publishing Worker
- WORKER-003: Instagram Analytics Sync Worker
- WORKER-004: Email Notification Worker

## References
- [Instagram Webhooks](https://developers.facebook.com/docs/instagram-api/webhooks)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Instagram Messaging API](https://developers.facebook.com/docs/messenger-platform/instagram)
