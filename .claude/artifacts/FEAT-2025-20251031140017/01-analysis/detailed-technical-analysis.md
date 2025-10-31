# Instagram Webhook Event Handling - Detailed Technical Analysis

**Feature ID:** FEAT-2025-20251031140017
**Date:** 2025-10-31
**Status:** Analysis Complete

---

## Executive Summary

This document provides a comprehensive technical analysis for implementing complete Instagram webhook event coverage in the Social Selling Platform. The existing infrastructure already handles 5 event types (comments, mentions, messages, story_mentions, live_comments). This enhancement adds 4 additional event types (message_reactions, messaging_postbacks, messaging_seen, story_insights) to provide complete webhook coverage.

**Current State:**
- Webhook endpoint: `/api/instagram/webhooks` (GET for verification, POST for events)
- Signature verification: HMAC SHA256 with timing-safe comparison
- Event storage: Generic `instagram_webhook_events` table + specific tables
- Processing: BullMQ async queue with 5 concurrent workers
- Deduplication: Event ID-based with duplicate tracking
- Auto-reply: Integrated for comments and messages

**Target State:**
- All 9 Instagram webhook event types supported
- Complete event persistence with proper indexing
- Enhanced normalization for new event structures
- Comprehensive analytics and reporting
- Production-ready error handling and logging

---

## 1. Current Codebase Assessment

### 1.1 Existing Webhook Infrastructure

#### Webhook Controller (`instagram-webhooks.controller.ts`)
```typescript
// Current endpoints:
GET  /api/instagram/webhooks       - Verification (hub.mode, hub.verify_token, hub.challenge)
POST /api/instagram/webhooks       - Event reception (with signature verification)
POST /api/instagram/webhooks/subscriptions - Create subscription
GET  /api/instagram/webhooks/events/:accountId - Get events
GET  /api/instagram/webhooks/stats/:accountId - Get statistics
POST /api/instagram/webhooks/retry/:accountId - Retry failed events
```

**Key Observations:**
- Raw body middleware configured in `main.ts` for signature verification
- Async processing pattern: immediate 200 OK response, background job queuing
- JwtAuthGuard on management endpoints
- ApiExcludeEndpoint on webhook receiver (hidden from Swagger)

#### Webhook Service (`instagram-webhooks.service.ts`)
```typescript
// Key methods:
verifySignature(signature: string, payload: string): boolean
verifySubscription(query: any): string | null
processWebhook(payload: any, signature: string): Promise<void>
determineEventType(change: any): WebhookEventType | null
extractEventData(change: any, eventType: WebhookEventType): any
generateEventId(eventType: WebhookEventType, eventData: any): string
markEventProcessed(eventId: string): Promise<void>
markEventFailed(eventId: string, error: string): Promise<void>
```

**Key Observations:**
- Currently handles 5 event types: COMMENT, MENTION, MESSAGE, STORY_MENTION, LIVE_COMMENT
- Signature verification uses crypto.timingSafeEqual (timing attack protection)
- Event deduplication via unique event_id in database
- Duplicate events tracked with is_duplicate flag and reference to original
- Account lookup via instagram_business_account_id from payload

#### Webhook Processor (`webhook-events.processor.ts`)
```typescript
@Processor('instagram-webhook-events', { concurrency: 5 })
class WebhookEventsProcessor extends WorkerHost {
  async process(job: Job<WebhookEventJobData, WebhookEventJobResult>)

  // Storage methods:
  private async storeComment(accountId: string, comment: any)
  private async storeMention(accountId: string, mention: any)
  private async storeMessage(accountId: string, message: any)
  private async storeStoryInsight(accountId: string, insight: any)

  // Auto-reply:
  private async handleAutoReply(...)
}
```

**Key Observations:**
- BullMQ processor with 5 concurrent workers
- Retry: 3 attempts with exponential backoff (2s initial delay)
- Job retention: 1000 completed (24h), 5000 failed (7 days)
- Integrates with EventDeduplicationService, EventNormalizerService, AutoReplyService
- Existing storeStoryInsight method (story_insights partially implemented)

### 1.2 Database Schema Analysis

#### Current Tables:

**instagram_webhook_events** (Generic event log)
```sql
- id (UUID)
- event_type (VARCHAR) - COMMENT, MENTION, MESSAGE, STORY_MENTION, LIVE_COMMENT
- event_id (VARCHAR) - Unique, used for deduplication
- instagram_account_id (UUID FK)
- object_type (VARCHAR) - message, comment, story, live_video
- object_id (VARCHAR)
- sender_ig_id (VARCHAR)
- sender_username (VARCHAR)
- payload (JSONB) - Full raw event
- processed (BOOLEAN)
- processed_at (TIMESTAMPTZ)
- processing_attempts (INTEGER)
- last_processing_error (TEXT)
- is_duplicate (BOOLEAN)
- duplicate_of (UUID FK)
- created_at, updated_at (TIMESTAMPTZ)

Indexes:
- event_type, account_id, processed, event_id (unique), created_at, sender_ig_id, is_duplicate
```

**instagram_comments**
```sql
- id (VARCHAR) - Instagram comment ID (PK)
- text, timestamp, from_id, from_username
- media_id, account_id (UUID FK)
- parent_id (for replies)
- like_count, is_hidden
- raw_data (JSONB)
```

**instagram_mentions**
```sql
- id (VARCHAR PK)
- media_id, comment_id
- timestamp, mentioned_in (story/post/comment)
- from_id, from_username
- account_id (UUID FK)
- raw_data (JSONB)
```

**instagram_story_insights** (EXISTS - may need enhancement)
```sql
- media_id, metric, value, timestamp
- account_id (UUID FK)
- raw_data (JSONB)
```

### 1.3 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Instagram Graph API                           │
│                 (Sends webhook events)                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              POST /api/instagram/webhooks                        │
│  - Raw body capture middleware (main.ts)                        │
│  - InstagramWebhooksController.handleWebhook()                  │
│  - Signature verification (HMAC SHA256)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ (Immediate 200 OK)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         InstagramWebhooksService.processWebhook()                │
│  - Parse payload (object, entry, changes/messaging)             │
│  - determineEventType() - Extract field name                    │
│  - extractEventData() - Get sender, object info                 │
│  - generateEventId() - eventType_objectId_senderId              │
│  - Check duplicate in DB (SELECT by event_id)                   │
│  - INSERT into instagram_webhook_events                         │
│  - Update subscription stats (events_received_count++)          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ (Fire & forget async)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              BullMQ Queue: instagram-webhook-events              │
│  - Job data: { eventType, eventId, accountId, payload }        │
│  - Priority: 1-10 (lower = higher)                             │
│  - Retry: 3 attempts, exponential backoff                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         WebhookEventsProcessor.process(job)                      │
│  1. Deduplication check (EventDeduplicationService)             │
│  2. Event normalization (EventNormalizerService)                │
│  3. Validation of normalized event                              │
│  4. Store in specific table (storeComment, storeMention, etc)   │
│  5. Auto-reply evaluation (AutoReplyService)                    │
│  6. Mark as processed (deduplicationService)                    │
│  7. Track analytics (EventAnalyticsService)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Tables                               │
│  - instagram_comments                                           │
│  - instagram_mentions                                           │
│  - messages / conversations                                     │
│  - instagram_story_insights                                     │
│  - [NEW TABLES NEEDED]                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. New Event Types Analysis

### 2.1 Message Reactions

**Webhook Payload Example:**
```json
{
  "field": "message_reactions",
  "value": {
    "sender": { "id": "12334" },
    "recipient": { "id": "23245" },
    "timestamp": 233445667,
    "reaction": {
      "mid": "random_mid",
      "action": "react",
      "reaction": "love",
      "emoji": "❤️"
    }
  }
}
```

**Data Mapping:**
- `object_type`: "message_reaction"
- `object_id`: `reaction.mid`
- `sender_id`: `sender.id`
- `event_id`: `message_reactions_{mid}_{sender.id}`

**Database Schema (NEW TABLE):**
```sql
CREATE TABLE instagram_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) NOT NULL,  -- reaction.mid
    conversation_id UUID,  -- Link to conversations table
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    sender_ig_id VARCHAR(255) NOT NULL,
    recipient_ig_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('react', 'unreact')),
    reaction_type VARCHAR(50),  -- 'love', 'like', 'wow', etc.
    emoji VARCHAR(10),
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, sender_ig_id, timestamp)
);

CREATE INDEX idx_message_reactions_account ON instagram_message_reactions(account_id);
CREATE INDEX idx_message_reactions_message ON instagram_message_reactions(message_id);
CREATE INDEX idx_message_reactions_sender ON instagram_message_reactions(sender_ig_id);
CREATE INDEX idx_message_reactions_timestamp ON instagram_message_reactions(timestamp DESC);
CREATE INDEX idx_message_reactions_action ON instagram_message_reactions(action);
```

**Use Cases:**
- Track emotional response to automated messages
- Measure engagement with product recommendations
- Trigger follow-up actions based on positive reactions
- Analytics: reaction type distribution, most reacted messages

---

### 2.2 Messaging Postbacks

**Webhook Payload Example:**
```json
{
  "field": "messaging_postbacks",
  "value": {
    "sender": { "id": "2494432963985342" },
    "recipient": { "id": "90010195674710" },
    "timestamp": 233445667,
    "is_self": true,
    "postback": {
      "mid": "aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlE",
      "title": "Talk to human",
      "payload": "Payload"
    }
  }
}
```

**Data Mapping:**
- `object_type`: "messaging_postback"
- `object_id`: `postback.mid`
- `sender_id`: `sender.id`
- `event_id`: `messaging_postbacks_{mid}_{sender.id}`

**Database Schema (NEW TABLE):**
```sql
CREATE TABLE instagram_messaging_postbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(255) NOT NULL,  -- postback.mid
    conversation_id UUID,
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    sender_ig_id VARCHAR(255) NOT NULL,
    recipient_ig_id VARCHAR(255) NOT NULL,
    is_self BOOLEAN DEFAULT FALSE,
    postback_title VARCHAR(255),
    postback_payload TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, sender_ig_id)
);

CREATE INDEX idx_messaging_postbacks_account ON instagram_messaging_postbacks(account_id);
CREATE INDEX idx_messaging_postbacks_message ON instagram_messaging_postbacks(message_id);
CREATE INDEX idx_messaging_postbacks_sender ON instagram_messaging_postbacks(sender_ig_id);
CREATE INDEX idx_messaging_postbacks_timestamp ON instagram_messaging_postbacks(timestamp DESC);
CREATE INDEX idx_messaging_postbacks_payload ON instagram_messaging_postbacks(postback_payload);
CREATE INDEX idx_messaging_postbacks_processed ON instagram_messaging_postbacks(processed) WHERE processed = FALSE;
```

**Use Cases:**
- Handle button clicks in structured messages (e.g., "View Products", "Contact Sales")
- Route conversations based on user intent (payload data)
- Track conversion funnel from automated message to action
- Implement interactive product catalogs

---

### 2.3 Messaging Seen (Read Receipts)

**Webhook Payload Example:**
```json
{
  "field": "messaging_seen",
  "value": {
    "sender": { "id": "12334" },
    "recipient": { "id": "23245" },
    "timestamp": "1527459824",
    "read": {
      "mid": "last_message_id_read"
    }
  }
}
```

**Data Mapping:**
- `object_type`: "messaging_seen"
- `object_id`: `read.mid`
- `sender_id`: `sender.id` (who read the message)
- `event_id`: `messaging_seen_{mid}_{sender.id}_{timestamp}`

**Database Schema (NEW TABLE):**
```sql
CREATE TABLE instagram_messaging_seen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_message_id VARCHAR(255) NOT NULL,  -- read.mid
    conversation_id UUID,
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    reader_ig_id VARCHAR(255) NOT NULL,  -- sender (who read)
    recipient_ig_id VARCHAR(255) NOT NULL,  -- recipient
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(last_message_id, reader_ig_id, timestamp)
);

CREATE INDEX idx_messaging_seen_account ON instagram_messaging_seen(account_id);
CREATE INDEX idx_messaging_seen_message ON instagram_messaging_seen(last_message_id);
CREATE INDEX idx_messaging_seen_reader ON instagram_messaging_seen(reader_ig_id);
CREATE INDEX idx_messaging_seen_timestamp ON instagram_messaging_seen(timestamp DESC);
```

**Use Cases:**
- Track message open rates for marketing campaigns
- Understand response time patterns (time from send to read to reply)
- Identify engaged vs. non-engaged contacts
- Trigger follow-up messages after read receipt (e.g., "Still interested?")
- Calculate conversation engagement metrics

---

### 2.4 Story Insights

**Webhook Payload Example:**
```json
{
  "field": "story_insights",
  "value": {
    "media_id": "17887498072083520",
    "impressions": 444,
    "reach": 44,
    "taps_forward": 4,
    "taps_back": 3,
    "exits": 3,
    "replies": 0
  }
}
```

**Data Mapping:**
- `object_type`: "story_insight"
- `object_id`: `media_id`
- `event_id`: `story_insights_{media_id}`

**Database Schema (ENHANCE EXISTING TABLE):**
```sql
-- Review existing instagram_story_insights table
-- Current structure may be metric-based (one row per metric)
-- Consider if structure needs adjustment for bulk metrics

-- Option 1: Enhance existing (if metric-based):
-- Keep current structure, insert multiple rows (one per metric)

-- Option 2: Create new aggregate table (RECOMMENDED):
CREATE TABLE instagram_story_insights_aggregated (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
    impressions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    taps_forward INTEGER DEFAULT 0,
    taps_back INTEGER DEFAULT 0,
    exits INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(media_id, timestamp)
);

CREATE INDEX idx_story_insights_agg_account ON instagram_story_insights_aggregated(account_id);
CREATE INDEX idx_story_insights_agg_media ON instagram_story_insights_aggregated(media_id);
CREATE INDEX idx_story_insights_agg_timestamp ON instagram_story_insights_aggregated(timestamp DESC);
```

**Use Cases:**
- Track story performance in real-time
- Identify high-performing story content
- Understand viewer engagement (taps forward/back = interest level)
- Measure story-to-reply conversion
- Compare story reach vs. impressions (unique vs. total views)
- Optimize posting times based on reach data

---

## 3. Implementation Plan

### 3.1 DTO Updates

**File:** `backend/src/modules/instagram/dto/webhook.dto.ts`

```typescript
// Add to WebhookEventType enum:
export enum WebhookEventType {
  COMMENT = 'comment',
  MENTION = 'mention',
  MESSAGE = 'message',
  STORY_MENTION = 'story_mention',
  LIVE_COMMENT = 'live_comment',
  MESSAGE_REACTIONS = 'message_reactions',      // NEW
  MESSAGING_POSTBACKS = 'messaging_postbacks',  // NEW
  MESSAGING_SEEN = 'messaging_seen',            // NEW
  STORY_INSIGHTS = 'story_insights',            // NEW
}

// Add new DTOs:
export class MessageReactionDto {
  @ApiProperty()
  @IsString()
  mid!: string;

  @ApiProperty()
  @IsEnum(['react', 'unreact'])
  action!: 'react' | 'unreact';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reaction?: string;  // 'love', 'like', etc.

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emoji?: string;
}

export class MessageReactionEventDto {
  @ApiProperty()
  @IsObject()
  sender!: { id: string };

  @ApiProperty()
  @IsObject()
  recipient!: { id: string };

  @ApiProperty()
  @IsNumber()
  timestamp!: number;

  @ApiProperty({ type: MessageReactionDto })
  @ValidateNested()
  @Type(() => MessageReactionDto)
  reaction!: MessageReactionDto;
}

export class MessagingPostbackDto {
  @ApiProperty()
  @IsString()
  mid!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  payload!: string;
}

export class MessagingPostbackEventDto {
  @ApiProperty()
  @IsObject()
  sender!: { id: string };

  @ApiProperty()
  @IsObject()
  recipient!: { id: string };

  @ApiProperty()
  @IsNumber()
  timestamp!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_self?: boolean;

  @ApiProperty({ type: MessagingPostbackDto })
  @ValidateNested()
  @Type(() => MessagingPostbackDto)
  postback!: MessagingPostbackDto;
}

export class MessagingSeenEventDto {
  @ApiProperty()
  @IsObject()
  sender!: { id: string };

  @ApiProperty()
  @IsObject()
  recipient!: { id: string };

  @ApiProperty()
  timestamp!: string | number;

  @ApiProperty()
  @IsObject()
  read!: { mid: string };
}

export class StoryInsightsEventDto {
  @ApiProperty()
  @IsString()
  media_id!: string;

  @ApiProperty()
  @IsNumber()
  impressions!: number;

  @ApiProperty()
  @IsNumber()
  reach!: number;

  @ApiProperty()
  @IsNumber()
  taps_forward!: number;

  @ApiProperty()
  @IsNumber()
  taps_back!: number;

  @ApiProperty()
  @IsNumber()
  exits!: number;

  @ApiProperty()
  @IsNumber()
  replies!: number;
}
```

### 3.2 Service Updates

**File:** `backend/src/modules/instagram/services/instagram-webhooks.service.ts`

```typescript
// Update determineEventType method:
private determineEventType(change: any): WebhookEventType | null {
  const field = change.field || '';
  const value = change.value || change;

  // Existing logic...

  // NEW: Message reactions
  if (field === 'message_reactions' || value.reaction) {
    return WebhookEventType.MESSAGE_REACTIONS;
  }

  // NEW: Messaging postbacks
  if (field === 'messaging_postbacks' || value.postback) {
    return WebhookEventType.MESSAGING_POSTBACKS;
  }

  // NEW: Messaging seen (read receipts)
  if (field === 'messaging_seen' || value.read) {
    return WebhookEventType.MESSAGING_SEEN;
  }

  // NEW: Story insights
  if (field === 'story_insights' || (value.media_id && value.impressions !== undefined)) {
    return WebhookEventType.STORY_INSIGHTS;
  }

  return null;
}

// Update extractEventData method:
private extractEventData(change: any, eventType: WebhookEventType): any {
  const value = change.value || change;
  const data: any = {
    objectType: null,
    objectId: null,
    senderId: null,
    senderUsername: null,
  };

  switch (eventType) {
    // Existing cases...

    case WebhookEventType.MESSAGE_REACTIONS:
      data.objectType = 'message_reaction';
      data.objectId = value.reaction?.mid;
      data.senderId = value.sender?.id;
      break;

    case WebhookEventType.MESSAGING_POSTBACKS:
      data.objectType = 'messaging_postback';
      data.objectId = value.postback?.mid;
      data.senderId = value.sender?.id;
      break;

    case WebhookEventType.MESSAGING_SEEN:
      data.objectType = 'messaging_seen';
      data.objectId = value.read?.mid;
      data.senderId = value.sender?.id;  // Who read the message
      break;

    case WebhookEventType.STORY_INSIGHTS:
      data.objectType = 'story_insight';
      data.objectId = value.media_id;
      data.senderId = null;  // System-generated event
      break;
  }

  return data;
}
```

### 3.3 Processor Updates

**File:** `backend/src/workers/processors/webhook-events.processor.ts`

```typescript
// Add to storeEvent switch:
private async storeEvent(
  eventType: WebhookEventType,
  accountId: string,
  event: any,
): Promise<void> {
  switch (eventType) {
    // Existing cases...

    case WebhookEventType.MESSAGE_REACTIONS:
      await this.storeMessageReaction(accountId, event);
      break;

    case WebhookEventType.MESSAGING_POSTBACKS:
      await this.storeMessagingPostback(accountId, event);
      break;

    case WebhookEventType.MESSAGING_SEEN:
      await this.storeMessagingSeen(accountId, event);
      break;

    case WebhookEventType.STORY_INSIGHTS:
      await this.storeStoryInsightAggregated(accountId, event);
      break;

    default:
      this.logger.warn(`Unknown event type for storage: ${eventType}`);
  }
}

// NEW: Store message reaction
private async storeMessageReaction(accountId: string, reaction: any): Promise<void> {
  await this.database.none(
    `INSERT INTO instagram_message_reactions
     (message_id, conversation_id, account_id, sender_ig_id, recipient_ig_id,
      action, reaction_type, emoji, timestamp, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (message_id, sender_ig_id, timestamp) DO UPDATE SET
       action = EXCLUDED.action,
       reaction_type = EXCLUDED.reaction_type,
       emoji = EXCLUDED.emoji,
       updated_at = CURRENT_TIMESTAMP`,
    [
      reaction.reaction.mid,
      reaction.conversationId || null,
      accountId,
      reaction.sender.id,
      reaction.recipient.id,
      reaction.reaction.action,
      reaction.reaction.reaction || null,
      reaction.reaction.emoji || null,
      new Date(reaction.timestamp * 1000),
      reaction,
    ],
  );
}

// NEW: Store messaging postback
private async storeMessagingPostback(accountId: string, postback: any): Promise<void> {
  await this.database.none(
    `INSERT INTO instagram_messaging_postbacks
     (message_id, conversation_id, account_id, sender_ig_id, recipient_ig_id,
      is_self, postback_title, postback_payload, timestamp, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (message_id, sender_ig_id) DO UPDATE SET
       postback_title = EXCLUDED.postback_title,
       postback_payload = EXCLUDED.postback_payload,
       updated_at = CURRENT_TIMESTAMP`,
    [
      postback.postback.mid,
      postback.conversationId || null,
      accountId,
      postback.sender.id,
      postback.recipient.id,
      postback.is_self || false,
      postback.postback.title,
      postback.postback.payload,
      new Date(postback.timestamp * 1000),
      postback,
    ],
  );
}

// NEW: Store messaging seen
private async storeMessagingSeen(accountId: string, seen: any): Promise<void> {
  const timestamp = typeof seen.timestamp === 'string'
    ? new Date(parseInt(seen.timestamp) * 1000)
    : new Date(seen.timestamp * 1000);

  await this.database.none(
    `INSERT INTO instagram_messaging_seen
     (last_message_id, conversation_id, account_id, reader_ig_id, recipient_ig_id,
      timestamp, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (last_message_id, reader_ig_id, timestamp) DO NOTHING`,
    [
      seen.read.mid,
      seen.conversationId || null,
      accountId,
      seen.sender.id,  // Who read the message
      seen.recipient.id,
      timestamp,
      seen,
    ],
  );
}

// NEW: Store story insights (aggregated)
private async storeStoryInsightAggregated(accountId: string, insight: any): Promise<void> {
  await this.database.none(
    `INSERT INTO instagram_story_insights_aggregated
     (media_id, account_id, impressions, reach, taps_forward, taps_back, exits, replies,
      timestamp, raw_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (media_id, timestamp) DO UPDATE SET
       impressions = EXCLUDED.impressions,
       reach = EXCLUDED.reach,
       taps_forward = EXCLUDED.taps_forward,
       taps_back = EXCLUDED.taps_back,
       exits = EXCLUDED.exits,
       replies = EXCLUDED.replies,
       updated_at = CURRENT_TIMESTAMP`,
    [
      insight.media_id,
      accountId,
      insight.impressions,
      insight.reach,
      insight.taps_forward,
      insight.taps_back,
      insight.exits,
      insight.replies,
      new Date(),
      insight,
    ],
  );
}
```

### 3.4 Normalization Service Update

**File:** `backend/src/workers/services/event-normalizer.service.ts`

Add normalization logic for new event types to ensure consistent structure before storage.

---

## 4. Database Migrations

### Migration Files to Create:

1. `034-create-instagram-message-reactions.sql`
2. `035-create-instagram-messaging-postbacks.sql`
3. `036-create-instagram-messaging-seen.sql`
4. `037-create-instagram-story-insights-aggregated.sql` (if needed)
5. `038-update-webhook-event-types.sql` (add new enum values if using ENUM type)

---

## 5. Security Considerations

### 5.1 Signature Verification
- Already implemented: HMAC SHA256 with timing-safe comparison
- Raw body preserved in middleware before JSON parsing
- No changes needed for new event types (same verification process)

### 5.2 Data Validation
- DTOs with class-validator ensure type safety
- Database constraints prevent invalid data
- JSONB raw_data field preserves original payload for debugging

### 5.3 Rate Limiting
- Consider implementing rate limiting on webhook endpoint if high volume expected
- BullMQ queue provides natural backpressure mechanism
- Monitor queue depth and processing latency

---

## 6. Testing Strategy

### 6.1 Unit Tests
- DTO validation tests for new event types
- Service method tests (determineEventType, extractEventData)
- Processor storage method tests (mock database)

### 6.2 Integration Tests
- End-to-end webhook flow with sample payloads
- Signature verification with test secrets
- Database persistence verification
- Queue processing verification

### 6.3 Manual Testing
- Use Instagram Graph API Explorer to trigger test webhooks
- Create webhook subscriptions for test Instagram account
- Monitor logs during test event reception
- Verify data in database tables

---

## 7. Monitoring and Observability

### 7.1 Logging
- DEBUG: Event reception, signature verification details
- INFO: Event processing start/complete, storage success
- ERROR: Signature failures, parsing errors, database errors

### 7.2 Metrics (Prometheus)
- Webhook events received (counter) by event_type
- Webhook processing duration (histogram) by event_type
- Webhook processing failures (counter) by event_type, error_type
- Queue depth (gauge) for instagram-webhook-events
- Duplicate events detected (counter)

### 7.3 Alerting
- High failure rate (>5% over 5 minutes)
- Queue depth exceeding threshold (>1000 jobs)
- No events received for extended period (webhook subscription issue)

---

## 8. Rollback Strategy

### 8.1 Database Rollback
Each migration includes rollback SQL:
```sql
-- ROLLBACK
DROP TABLE IF EXISTS instagram_message_reactions CASCADE;
```

### 8.2 Code Rollback
- Revert webhook service changes (determineEventType, extractEventData)
- Revert processor changes (storeEvent cases)
- Keep database tables (historical data preserved)
- Unknown event types will be logged but not processed

---

## 9. Performance Considerations

### 9.1 Database Indexes
All new tables include indexes on:
- account_id (for user-specific queries)
- timestamp (for chronological ordering)
- Foreign key fields (for JOINs)
- Filter fields (action, processed, etc.)

### 9.2 Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Consider partitioning for high-volume tables
- Implement data retention policies (archive old events)

### 9.3 Queue Performance
- Current: 5 concurrent workers
- Monitor job processing time
- Scale horizontally if needed (add more workers)

---

## 10. Future Enhancements

1. **Real-time Dashboard**: WebSocket updates for webhook event stream
2. **Advanced Analytics**: Aggregate queries for engagement metrics
3. **Auto-reply Rules**: Extend to message reactions and postbacks
4. **Conversation Context**: Link reactions/postbacks to original messages
5. **ML Integration**: Sentiment analysis on reactions, intent classification on postbacks
6. **Export/Reporting**: CSV/PDF reports of webhook events
7. **Webhook Replay**: Re-process events for testing/debugging

---

## 11. Deployment Checklist

- [ ] Review and test all database migrations
- [ ] Update environment variables (if needed)
- [ ] Deploy code changes to staging
- [ ] Run integration tests on staging
- [ ] Monitor logs during staging deployment
- [ ] Verify webhook events are processed correctly
- [ ] Deploy to production during low-traffic window
- [ ] Monitor production metrics for 24 hours
- [ ] Create Instagram webhook subscriptions for new event types
- [ ] Document new event types in API documentation

---

## Conclusion

This implementation extends the robust existing webhook infrastructure to support all Instagram event types. The design leverages existing patterns (DTOs, entities, services, processors, queues) to ensure maintainability. Database schema is designed for efficient querying and analytics. Security is maintained through signature verification. The system is production-ready with comprehensive error handling, logging, and monitoring.

**Estimated Effort:** 8-12 hours
- DTOs and validation: 1-2 hours
- Database migrations: 1-2 hours
- Service updates: 2-3 hours
- Processor updates: 2-3 hours
- Testing: 2-3 hours
- Documentation: 1 hour

**Risk Level:** Low-Medium
- Existing infrastructure proven in production
- New event types follow established patterns
- Comprehensive deduplication and error handling
- Rollback strategy available
