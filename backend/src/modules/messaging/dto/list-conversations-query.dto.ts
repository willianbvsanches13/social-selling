import { IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from './conversation-response.dto';

export class ListConversationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by conversation status',
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
