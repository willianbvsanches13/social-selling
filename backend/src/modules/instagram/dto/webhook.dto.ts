import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
  IsObject,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WebhookEventType {
  COMMENT = 'comment',
  MENTION = 'mention',
  MESSAGE = 'message',
  STORY_MENTION = 'story_mention',
  LIVE_COMMENT = 'live_comment',
  MESSAGE_REACTIONS = 'message_reactions',
  MESSAGING_POSTBACKS = 'messaging_postbacks',
  MESSAGING_SEEN = 'messaging_seen',
  STORY_INSIGHTS = 'story_insights',
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

// ============================================
// New DTOs for Additional Webhook Event Types
// ============================================

/**
 * Message Reaction DTO - Represents a reaction to a message
 * Used for message_reactions webhook events
 */
export class MessageReactionDto {
  @ApiProperty({
    description: 'Message ID that was reacted to',
    example: 'mid.1234567890',
  })
  @IsString()
  mid!: string;

  @ApiPropertyOptional({
    description: 'Reaction emoji or reaction type',
    example: '👍',
  })
  @IsOptional()
  @IsString()
  reaction?: string;

  @ApiPropertyOptional({
    description: 'Emoji used for reaction',
    example: '❤️',
  })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiPropertyOptional({
    description: 'Reaction type',
    example: 'love',
  })
  @IsOptional()
  @IsString()
  reaction_type?: string;

  @ApiProperty({
    description: 'Action performed: react or unreact',
    enum: ['react', 'unreact'],
    example: 'react',
  })
  @IsString()
  @IsIn(['react', 'unreact'])
  action!: string;
}

/**
 * Message Reaction Event DTO
 * Container for message_reactions webhook payload
 */
export class MessageReactionEventDto {
  @ApiProperty({
    description: 'Array of message reactions',
    type: [MessageReactionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageReactionDto)
  message_reactions!: MessageReactionDto[];
}

/**
 * Postback Payload DTO - Represents the payload of a button click
 */
export class PostbackPayloadDto {
  @ApiPropertyOptional({
    description: 'Payload data (can be string or object)',
    example: 'GET_STARTED_PAYLOAD',
  })
  @IsOptional()
  payload?: string | Record<string, any>;
}

/**
 * Messaging Postback DTO - Represents button clicks from structured messages
 * Used for ice breakers, quick replies, persistent menu, etc.
 */
export class MessagingPostbackDto {
  @ApiProperty({
    description: 'Message ID of the postback',
    example: 'mid.1234567890',
  })
  @IsString()
  mid!: string;

  @ApiPropertyOptional({
    description: 'Title of the button clicked',
    example: 'Get Started',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Payload of the button clicked',
    example: 'GET_STARTED_PAYLOAD',
  })
  @IsString()
  payload!: string;
}

/**
 * Messaging Postback Event DTO
 * Container for messaging_postbacks webhook payload
 */
export class MessagingPostbackEventDto {
  @ApiProperty({
    description: 'Array of messaging postbacks',
    type: [MessagingPostbackDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessagingPostbackDto)
  messaging_postbacks!: MessagingPostbackDto[];
}

/**
 * Messaging Seen Event DTO - Represents read receipts
 * Used for messaging_seen webhook events to track when messages are read
 */
export class MessagingSeenEventDto {
  @ApiProperty({
    description: 'Watermark timestamp (Unix timestamp)',
    example: 1635724800,
  })
  @IsNumber()
  watermark!: number;

  @ApiPropertyOptional({
    description: 'Last message ID that was read',
    example: 'mid.1234567890',
  })
  @IsOptional()
  @IsString()
  mid?: string;
}

/**
 * Insight Metric DTO - Represents individual story insight metrics
 */
export class InsightMetricDto {
  @ApiPropertyOptional({
    description: 'Number of accounts reached',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  reach?: number;

  @ApiPropertyOptional({
    description: 'Number of impressions',
    example: 1500,
  })
  @IsOptional()
  @IsNumber()
  impressions?: number;

  @ApiPropertyOptional({
    description: 'Number of exits',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  exits?: number;

  @ApiPropertyOptional({
    description: 'Number of replies',
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  replies?: number;

  @ApiPropertyOptional({
    description: 'Number of taps forward',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  taps_forward?: number;

  @ApiPropertyOptional({
    description: 'Number of taps back',
    example: 20,
  })
  @IsOptional()
  @IsNumber()
  taps_back?: number;
}

/**
 * Story Insights Event DTO - Represents story performance metrics
 * Used for story_insights webhook events
 */
export class StoryInsightsEventDto {
  @ApiProperty({
    description: 'Instagram media ID',
    example: '17895695668004550',
  })
  @IsString()
  media_id!: string;

  @ApiPropertyOptional({
    description: 'Story insights metrics',
    type: InsightMetricDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InsightMetricDto)
  insights?: InsightMetricDto;
}

export class WebhookChangeValueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  from?: {
    id: string;
    username?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  media?: {
    id: string;
    media_product_type?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  messages?: Array<{
    id: string;
    text?: string;
    attachments?: any[];
    timestamp?: number;
  }>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  sender?: {
    id: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  recipient?: {
    id: string;
  };

  // New event type fields
  @ApiPropertyOptional({
    description: 'Message reactions array',
    type: [MessageReactionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageReactionDto)
  message_reactions?: MessageReactionDto[];

  @ApiPropertyOptional({
    description: 'Messaging postbacks array',
    type: [MessagingPostbackDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessagingPostbackDto)
  messaging_postbacks?: MessagingPostbackDto[];

  @ApiPropertyOptional({
    description: 'Messaging seen event',
    type: MessagingSeenEventDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MessagingSeenEventDto)
  messaging_seen?: MessagingSeenEventDto;

  @ApiPropertyOptional({
    description: 'Story insights event',
    type: StoryInsightsEventDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StoryInsightsEventDto)
  story_insights?: StoryInsightsEventDto;
}

export class WebhookChangeDto {
  @ApiProperty({
    description: 'Field that changed (messages, comments, mentions)',
  })
  @IsString()
  field!: string;

  @ApiProperty({ description: 'Change value data' })
  @IsObject()
  value!: WebhookChangeValueDto;
}

export class WebhookEntryDto {
  @ApiProperty({ description: 'Instagram user/page ID' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Event timestamp' })
  time!: number;

  @ApiPropertyOptional({
    description: 'Array of changes',
    type: [WebhookChangeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookChangeDto)
  changes?: WebhookChangeDto[];

  @ApiPropertyOptional({ description: 'Messaging events (alternative format)' })
  @IsOptional()
  @IsArray()
  messaging?: any[];
}

export class InstagramWebhookDto {
  @ApiProperty({ description: 'Object type (instagram, page)' })
  @IsString()
  object!: string;

  @ApiProperty({ description: 'Array of entries', type: [WebhookEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEntryDto)
  entry!: WebhookEntryDto[];
}

export class CreateWebhookSubscriptionDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsString()
  @IsNotEmpty()
  instagramAccountId!: string;

  @ApiProperty({
    description: 'Subscription fields',
    enum: SubscriptionField,
    isArray: true,
  })
  @IsArray()
  @IsEnum(SubscriptionField, { each: true })
  subscriptionFields!: SubscriptionField[];

  @ApiPropertyOptional({
    description: 'Custom verify token (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  verifyToken?: string;
}

export class WebhookEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: WebhookEventType })
  eventType!: WebhookEventType;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  objectType!: string;

  @ApiProperty()
  objectId!: string;

  @ApiProperty()
  senderIgId!: string;

  @ApiProperty()
  senderUsername!: string;

  @ApiProperty()
  processed!: boolean;

  @ApiProperty()
  processingAttempts!: number;

  @ApiProperty()
  createdAt!: Date;
}

export class WebhookStatsDto {
  @ApiProperty()
  totalEvents!: number;

  @ApiProperty()
  processedEvents!: number;

  @ApiProperty()
  pendingEvents!: number;

  @ApiProperty()
  failedEvents!: number;

  @ApiProperty()
  duplicateEvents!: number;

  @ApiProperty()
  eventsByType!: Record<string, number>;
}
