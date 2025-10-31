import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsDateString,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
  Max,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PostMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CAROUSEL = 'CAROUSEL',
  REELS = 'REELS',
  STORIES = 'STORIES',
}

export enum PostStatus {
  SCHEDULED = 'scheduled',
  PUBLISHING = 'publishing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class ProductTagDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: 'X coordinate (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @ApiProperty({ description: 'Y coordinate (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;
}

export class CreateScheduledPostDto {
  @ApiProperty({ description: 'Client account ID' })
  @IsUUID()
  clientAccountId!: string;

  @ApiProperty({ description: 'Scheduled publish time (ISO 8601)' })
  @IsDateString()
  scheduledFor!: string;

  @ApiProperty({ description: 'Post caption' })
  @IsString()
  caption!: string;

  @ApiProperty({ description: 'Media URLs (uploaded to S3)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  mediaUrls!: string[];

  @ApiProperty({ description: 'Media type', enum: PostMediaType })
  @IsEnum(PostMediaType)
  mediaType!: PostMediaType;

  @ApiPropertyOptional({
    description: 'Product tags for shopping posts',
    type: [ProductTagDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTagDto)
  productTags?: ProductTagDto[];

  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  templateVariables?: Record<string, string>;
}

export class UpdateScheduledPostDto {
  @ApiPropertyOptional({ description: 'Scheduled publish time' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({ description: 'Post caption' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: 'Media URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Product tags', type: [ProductTagDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTagDto)
  productTags?: ProductTagDto[];

  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsString()
  locationId?: string;
}

export class ScheduledPostResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientAccountId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  scheduledFor!: Date;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiProperty()
  caption!: string;

  @ApiProperty({ type: [String] })
  mediaUrls!: string[];

  @ApiProperty({ enum: PostMediaType })
  mediaType!: PostMediaType;

  @ApiProperty({ enum: PostStatus })
  status!: PostStatus;

  @ApiProperty()
  publishAttempts!: number;

  @ApiPropertyOptional()
  lastPublishError?: string;

  @ApiPropertyOptional()
  instagramMediaId?: string;

  @ApiPropertyOptional()
  permalink?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;
}

export class ListScheduledPostsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: PostStatus })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({ description: 'Get posts scheduled after this date' })
  @IsOptional()
  @IsDateString()
  scheduledAfter?: string;

  @ApiPropertyOptional({ description: 'Get posts scheduled before this date' })
  @IsOptional()
  @IsDateString()
  scheduledBefore?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}

export class PaginatedScheduledPostsResponseDto {
  @ApiProperty({ type: [ScheduledPostResponseDto] })
  posts!: ScheduledPostResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class PublishNowResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  scheduledPostId!: string;

  @ApiProperty()
  status!: PostStatus;
}

export class CancelScheduledPostResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  scheduledPostId!: string;

  @ApiProperty()
  status!: PostStatus;
}
