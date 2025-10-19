import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  SPAM = 'spam',
}

export enum ConversationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class ListConversationsDto {
  @ApiPropertyOptional({
    description: 'Status filter',
    enum: ConversationStatus,
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Only show unread conversations' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: ConversationPriority,
  })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ description: 'Search participant name or username' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'Conversation status',
    enum: ConversationStatus,
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ description: 'Assign to user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string | null;

  @ApiPropertyOptional({
    description: 'Conversation priority',
    enum: ConversationPriority,
  })
  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @ApiPropertyOptional({ description: 'Conversation tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Mark as read' })
  @IsOptional()
  @IsBoolean()
  markAsRead?: boolean;
}

export class ConversationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationIgId!: string;

  @ApiProperty()
  participantIgId!: string;

  @ApiProperty()
  participantUsername!: string;

  @ApiProperty()
  participantName!: string;

  @ApiProperty()
  participantProfilePicUrl!: string;

  @ApiProperty()
  participantIsVerified!: boolean;

  @ApiProperty()
  lastMessageAt: Date | null = null;

  @ApiProperty()
  lastMessageText: string | null = null;

  @ApiProperty()
  lastMessageSender: string | null = null;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty({ enum: ConversationStatus })
  status!: ConversationStatus;

  @ApiProperty()
  tags: string[] = [];

  @ApiProperty()
  assignedTo: string | null = null;

  @ApiProperty({ enum: ConversationPriority })
  priority!: ConversationPriority;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  archivedAt: Date | null = null;
}
