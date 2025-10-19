import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  ValidateNested,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
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
}

export class WebhookChangeDto {
  @ApiProperty({ description: 'Field that changed (messages, comments, mentions)' })
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

  @ApiPropertyOptional({ description: 'Array of changes', type: [WebhookChangeDto] })
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
