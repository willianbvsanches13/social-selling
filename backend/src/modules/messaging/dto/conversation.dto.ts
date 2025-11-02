import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsString,
  MinLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationStatus } from '../../../domain/entities/conversation.entity';

export class ConversationFilterDto {
  @ApiProperty({ description: 'Client account ID to filter conversations' })
  @IsUUID()
  clientAccountId!: string;

  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasUnread?: boolean;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export class SearchConversationsDto {
  @ApiProperty({ minLength: 2 })
  @IsString()
  @MinLength(2)
  query!: string;
}

export class ConversationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientAccountId!: string;

  @ApiProperty()
  platformConversationId!: string;

  @ApiProperty()
  participantPlatformId!: string;

  @ApiPropertyOptional()
  participantUsername?: string;

  @ApiPropertyOptional()
  participantProfilePic?: string;

  @ApiPropertyOptional()
  lastMessageAt?: Date;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty({ enum: ConversationStatus })
  status!: ConversationStatus;

  @ApiProperty()
  metadata!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ConversationListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  conversations!: ConversationResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
