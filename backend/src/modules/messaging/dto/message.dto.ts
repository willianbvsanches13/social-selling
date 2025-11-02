import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MessageType,
  SenderType,
} from '../../../domain/entities/message.entity';

export class SendMessageDto {
  @ApiProperty({ minLength: 1, maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;
}

export class MessageFilterDto {
  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 100;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export class MessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  platformMessageId!: string;

  @ApiProperty({ enum: SenderType })
  senderType!: SenderType;

  @ApiPropertyOptional()
  senderPlatformId?: string;

  @ApiProperty({ enum: MessageType })
  messageType!: MessageType;

  @ApiPropertyOptional()
  content?: string;

  @ApiPropertyOptional()
  mediaUrl?: string;

  @ApiPropertyOptional()
  mediaType?: string;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty()
  sentAt!: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiProperty()
  metadata!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  messages!: MessageResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
