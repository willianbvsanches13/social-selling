import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsUrl,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  STICKER = 'sticker',
  SHARE = 'share',
  STORY_REPLY = 'story_reply',
}

export class MessageAttachmentDto {
  @ApiProperty({ description: 'Attachment type' })
  @IsEnum(MessageType)
  type!: MessageType;

  @ApiProperty({ description: 'Attachment URL' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL for videos' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  size?: number;

  @ApiPropertyOptional({ description: 'Duration in seconds for audio/video' })
  @IsOptional()
  @IsInt()
  duration?: number;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsUUID()
  instagramAccountId!: string;

  @ApiProperty({
    description: 'Recipient Instagram user ID or conversation ID',
  })
  @IsString()
  recipient!: string;

  @ApiPropertyOptional({ description: 'Message text content' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'Message attachments',
    type: [MessageAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];

  @ApiPropertyOptional({ description: 'Message ID to reply to' })
  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @ApiPropertyOptional({ description: 'Story ID if replying to story' })
  @IsOptional()
  @IsString()
  storyId?: string;

  @ApiPropertyOptional({ description: 'Use message template ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Template variables as key-value pairs' })
  @IsOptional()
  templateVariables?: Record<string, string>;
}

export class ListMessagesDto {
  @ApiPropertyOptional({
    description: 'Filter by message type',
    enum: MessageType,
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional({ description: 'Filter by sender type (user/customer)' })
  @IsOptional()
  @IsString()
  senderType?: string;

  @ApiPropertyOptional({ description: 'Search message content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Get messages before this date' })
  @IsOptional()
  @Type(() => Date)
  before?: Date;

  @ApiPropertyOptional({ description: 'Get messages after this date' })
  @IsOptional()
  @Type(() => Date)
  after?: Date;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}

export class MessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  messageIgId!: string;

  @ApiProperty()
  senderIgId!: string;

  @ApiProperty()
  senderType!: string;

  @ApiProperty({ enum: MessageType })
  messageType!: MessageType;

  @ApiProperty()
  textContent: string | null = null;

  @ApiProperty()
  attachments: MessageAttachmentDto[] = [];

  @ApiProperty()
  isDeleted!: boolean;

  @ApiProperty()
  sentAt!: Date;

  @ApiProperty()
  deliveredAt: Date | null = null;

  @ApiProperty()
  readAt: Date | null = null;

  @ApiProperty()
  createdAt!: Date;
}
