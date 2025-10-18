# IG-006: Instagram Post Scheduling

**Epic:** Social Selling Platform - Instagram Integration
**Sprint:** Sprint 3
**Story Points:** 13
**Priority:** High
**Assignee:** Backend Team
**Status:** Ready for Development

---

## Overview

Implement comprehensive Instagram post scheduling functionality using BullMQ delayed jobs. This includes scheduling posts with media uploads to MinIO S3, caption templates with variable substitution, optimal posting time suggestions, post status tracking, retry logic for failed posts, and full Instagram Graph API publishing integration.

---

## Business Value

- **Time Management**: Schedule posts in advance for consistent presence
- **Optimal Timing**: Post when audience is most engaged
- **Content Planning**: Plan and review content calendar
- **Automation**: Reduce manual posting workload
- **Consistency**: Maintain regular posting schedule
- **Global Reach**: Schedule posts for different time zones

---

## Technical Requirements

### 1. Database Schema

#### Scheduled Posts Table
```sql
-- Migration: 20250118000011_create_instagram_scheduled_posts.sql

CREATE TABLE instagram_scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,

    -- Post content
    caption TEXT NOT NULL,
    media_urls JSONB NOT NULL DEFAULT '[]', -- Array of S3 URLs
    media_type VARCHAR(50) NOT NULL, -- IMAGE, VIDEO, CAROUSEL, REELS
    product_tags JSONB DEFAULT '[]',
    location_id VARCHAR(255),

    -- Template
    template_id UUID REFERENCES instagram_post_templates(id) ON DELETE SET NULL,
    template_variables JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- scheduled, publishing, published, failed, cancelled
    publish_attempts INTEGER DEFAULT 0,
    last_publish_error TEXT,

    -- Instagram response
    instagram_media_id VARCHAR(255),
    instagram_media_url TEXT,
    permalink TEXT,

    -- Analytics
    initial_likes INTEGER DEFAULT 0,
    initial_comments INTEGER DEFAULT 0,
    initial_reach INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_scheduled_posts_account ON instagram_scheduled_posts(instagram_account_id);
CREATE INDEX idx_scheduled_posts_user ON instagram_scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_status ON instagram_scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_for ON instagram_scheduled_posts(scheduled_for);
CREATE INDEX idx_scheduled_posts_published_at ON instagram_scheduled_posts(published_at DESC);
CREATE INDEX idx_scheduled_posts_template ON instagram_scheduled_posts(template_id);
```

#### Post Templates Table
```sql
-- Migration: 20250118000012_create_instagram_post_templates.sql

CREATE TABLE instagram_post_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- product_launch, promotion, tip, testimonial, behind_scenes

    caption_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array of variable names
    default_media_type VARCHAR(50) DEFAULT 'IMAGE',

    suggested_hashtags JSONB DEFAULT '[]',
    suggested_mentions JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_templates_user ON instagram_post_templates(user_id);
CREATE INDEX idx_post_templates_account ON instagram_post_templates(instagram_account_id);
CREATE INDEX idx_post_templates_category ON instagram_post_templates(category);
CREATE INDEX idx_post_templates_active ON instagram_post_templates(is_active);
```

#### Posting Schedule Table
```sql
-- Migration: 20250118000013_create_instagram_posting_schedules.sql

CREATE TABLE instagram_posting_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,

    -- Schedule configuration
    day_of_week INTEGER NOT NULL, -- 0 = Sunday, 6 = Saturday
    time_slots JSONB NOT NULL DEFAULT '[]', -- Array of HH:MM strings
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',

    -- Optimal time analysis
    is_optimal BOOLEAN DEFAULT FALSE,
    engagement_score DECIMAL(5,2), -- Average engagement during this slot

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(instagram_account_id, day_of_week)
);

CREATE INDEX idx_posting_schedules_account ON instagram_posting_schedules(instagram_account_id);
CREATE INDEX idx_posting_schedules_optimal ON instagram_posting_schedules(is_optimal);
```

#### Media Assets Table
```sql
-- Migration: 20250118000014_create_instagram_media_assets.sql

CREATE TABLE instagram_media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    instagram_account_id UUID REFERENCES instagram_accounts(id) ON DELETE SET NULL,

    -- File information
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,

    -- Media type
    media_type VARCHAR(50) NOT NULL, -- image, video

    -- Storage
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_url TEXT NOT NULL,

    -- Image/Video metadata
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for videos, in seconds
    thumbnail_url TEXT,

    -- Usage tracking
    used_in_posts INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Tags for organization
    tags JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(s3_bucket, s3_key)
);

CREATE INDEX idx_media_assets_user ON instagram_media_assets(user_id);
CREATE INDEX idx_media_assets_account ON instagram_media_assets(instagram_account_id);
CREATE INDEX idx_media_assets_media_type ON instagram_media_assets(media_type);
CREATE INDEX idx_media_assets_created_at ON instagram_media_assets(created_at DESC);
```

---

### 2. DTOs (Data Transfer Objects)

```typescript
// src/modules/instagram/dto/scheduled-post.dto.ts

import { IsString, IsOptional, IsEnum, IsArray, IsUUID, IsDateString, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PostMediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CAROUSEL = 'CAROUSEL',
  REELS = 'REELS',
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
  productId: string;

  @ApiProperty({ description: 'X coordinate (0-1)' })
  x: number;

  @ApiProperty({ description: 'Y coordinate (0-1)' })
  y: number;
}

export class CreateScheduledPostDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsUUID()
  instagramAccountId: string;

  @ApiProperty({ description: 'Scheduled publish time (ISO 8601)' })
  @IsDateString()
  scheduledFor: string;

  @ApiProperty({ description: 'Post caption' })
  @IsString()
  caption: string;

  @ApiProperty({ description: 'Media URLs (uploaded to S3)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  mediaUrls: string[];

  @ApiProperty({ description: 'Media type', enum: PostMediaType })
  @IsEnum(PostMediaType)
  mediaType: PostMediaType;

  @ApiPropertyOptional({ description: 'Product tags for shopping posts', type: [ProductTagDto] })
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
  productTags?: ProductTagDto[];

  @ApiPropertyOptional({ description: 'Location ID' })
  @IsOptional()
  @IsString()
  locationId?: string;
}

export class ScheduledPostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  instagramAccountId: string;

  @ApiProperty()
  scheduledFor: Date;

  @ApiProperty()
  caption: string;

  @ApiProperty()
  mediaUrls: string[];

  @ApiProperty({ enum: PostMediaType })
  mediaType: PostMediaType;

  @ApiProperty({ enum: PostStatus })
  status: PostStatus;

  @ApiProperty()
  publishAttempts: number;

  @ApiPropertyOptional()
  instagramMediaId?: string;

  @ApiPropertyOptional()
  permalink?: string;

  @ApiProperty()
  createdAt: Date;
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

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
```

```typescript
// src/modules/instagram/dto/post-template.dto.ts

import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateCategory {
  PRODUCT_LAUNCH = 'product_launch',
  PROMOTION = 'promotion',
  TIP = 'tip',
  TESTIMONIAL = 'testimonial',
  BEHIND_SCENES = 'behind_scenes',
  ANNOUNCEMENT = 'announcement',
}

export class CreatePostTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template category', enum: TemplateCategory })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiProperty({ description: 'Caption template with variables like {{productName}}' })
  @IsString()
  captionTemplate: string;

  @ApiPropertyOptional({ description: 'Suggested hashtags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedHashtags?: string[];

  @ApiPropertyOptional({ description: 'Suggested mentions (usernames)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedMentions?: string[];

  @ApiPropertyOptional({ description: 'Default media type', enum: PostMediaType })
  @IsOptional()
  @IsEnum(PostMediaType)
  defaultMediaType?: PostMediaType;

  @ApiPropertyOptional({ description: 'Instagram account ID (optional)' })
  @IsOptional()
  @IsString()
  instagramAccountId?: string;
}

export class UpdatePostTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template category', enum: TemplateCategory })
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory;

  @ApiPropertyOptional({ description: 'Caption template' })
  @IsOptional()
  @IsString()
  captionTemplate?: string;

  @ApiPropertyOptional({ description: 'Suggested hashtags', type: [String] })
  @IsOptional()
  @IsArray()
  suggestedHashtags?: string[];

  @ApiPropertyOptional({ description: 'Suggested mentions', type: [String] })
  @IsOptional()
  @IsArray()
  suggestedMentions?: string[];

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

```typescript
// src/modules/instagram/dto/media-upload.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class MediaUploadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  s3Url: string;

  @ApiProperty()
  thumbnailUrl?: string;

  @ApiProperty()
  width?: number;

  @ApiProperty()
  height?: number;

  @ApiProperty()
  duration?: number;

  @ApiProperty()
  createdAt: Date;
}
```

---

### 3. Service Implementation

```typescript
// src/modules/instagram/services/instagram-scheduling.service.ts

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { InstagramScheduledPost } from '../entities/instagram-scheduled-post.entity';
import { InstagramPostTemplate } from '../entities/instagram-post-template.entity';
import { InstagramPostingSchedule } from '../entities/instagram-posting-schedule.entity';
import { InstagramGraphApiService } from './instagram-graph-api.service';
import { MinioService } from '../../storage/services/minio.service';
import { CreateScheduledPostDto, UpdateScheduledPostDto, ListScheduledPostsDto } from '../dto/scheduled-post.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as dayjs from 'dayjs';
import * as timezone from 'dayjs/plugin/timezone';
import * as utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class InstagramSchedulingService {
  private readonly logger = new Logger(InstagramSchedulingService.name);

  constructor(
    @InjectRepository(InstagramScheduledPost)
    private scheduledPostRepository: Repository<InstagramScheduledPost>,
    @InjectRepository(InstagramPostTemplate)
    private templateRepository: Repository<InstagramPostTemplate>,
    @InjectRepository(InstagramPostingSchedule)
    private scheduleRepository: Repository<InstagramPostingSchedule>,
    private graphApiService: InstagramGraphApiService,
    private minioService: MinioService,
    @InjectQueue('instagram-publishing') private publishQueue: Queue,
  ) {}

  /**
   * Create scheduled post
   */
  async createScheduledPost(userId: string, dto: CreateScheduledPostDto): Promise<any> {
    this.logger.log(`Creating scheduled post for user ${userId}`);

    // Validate scheduled time is in future
    const scheduledDate = dayjs(dto.scheduledFor);
    if (scheduledDate.isBefore(dayjs())) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Get Instagram account
    const account = await this.graphApiService.getAccountWithToken(dto.instagramAccountId, userId);

    // Process template if provided
    let caption = dto.caption;
    if (dto.templateId) {
      const template = await this.templateRepository.findOne({
        where: { id: dto.templateId, user_id: userId },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      // Process template
      caption = this.processTemplate(template.caption_template, dto.templateVariables || {});

      // Add suggested hashtags and mentions
      if (template.suggested_hashtags && template.suggested_hashtags.length > 0) {
        caption += '\n\n' + template.suggested_hashtags.map(tag => `#${tag}`).join(' ');
      }

      if (template.suggested_mentions && template.suggested_mentions.length > 0) {
        caption += '\n' + template.suggested_mentions.map(mention => `@${mention}`).join(' ');
      }

      // Update template usage
      template.usage_count += 1;
      template.last_used_at = new Date();
      await this.templateRepository.save(template);
    }

    // Validate media URLs
    if (!dto.mediaUrls || dto.mediaUrls.length === 0) {
      throw new BadRequestException('At least one media URL is required');
    }

    // Create scheduled post
    const scheduledPost = this.scheduledPostRepository.create({
      instagram_account_id: dto.instagramAccountId,
      user_id: userId,
      scheduled_for: scheduledDate.toDate(),
      caption,
      media_urls: dto.mediaUrls,
      media_type: dto.mediaType,
      product_tags: dto.productTags || [],
      location_id: dto.locationId,
      template_id: dto.templateId,
      template_variables: dto.templateVariables || {},
      status: 'scheduled',
    });

    await this.scheduledPostRepository.save(scheduledPost);

    // Queue for publishing
    const delay = scheduledDate.diff(dayjs(), 'millisecond');
    await this.queuePublishJob(scheduledPost.id, delay);

    this.logger.log(`Scheduled post created: ${scheduledPost.id}, publishing in ${delay}ms`);

    return this.mapToDto(scheduledPost);
  }

  /**
   * List scheduled posts
   */
  async listScheduledPosts(
    userId: string,
    accountId: string,
    dto: ListScheduledPostsDto,
  ): Promise<{ posts: any[]; total: number; page: number; limit: number }> {
    const { status, scheduledAfter, scheduledBefore, page = 1, limit = 20 } = dto;

    const queryBuilder = this.scheduledPostRepository.createQueryBuilder('post');
    queryBuilder.where('post.user_id = :userId', { userId });
    queryBuilder.andWhere('post.instagram_account_id = :accountId', { accountId });

    if (status) {
      queryBuilder.andWhere('post.status = :status', { status });
    }

    if (scheduledAfter) {
      queryBuilder.andWhere('post.scheduled_for >= :scheduledAfter', {
        scheduledAfter: dayjs(scheduledAfter).toDate(),
      });
    }

    if (scheduledBefore) {
      queryBuilder.andWhere('post.scheduled_for <= :scheduledBefore', {
        scheduledBefore: dayjs(scheduledBefore).toDate(),
      });
    }

    queryBuilder.orderBy('post.scheduled_for', 'ASC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();

    return {
      posts: posts.map(p => this.mapToDto(p)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get scheduled post by ID
   */
  async getScheduledPost(postId: string, userId: string): Promise<any> {
    const post = await this.scheduledPostRepository.findOne({
      where: { id: postId, user_id: userId },
    });

    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }

    return this.mapToDto(post);
  }

  /**
   * Update scheduled post
   */
  async updateScheduledPost(postId: string, userId: string, dto: UpdateScheduledPostDto): Promise<any> {
    const post = await this.scheduledPostRepository.findOne({
      where: { id: postId, user_id: userId },
    });

    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (post.status !== 'scheduled') {
      throw new BadRequestException('Can only update scheduled posts');
    }

    // Update fields
    if (dto.scheduledFor) {
      const newScheduledDate = dayjs(dto.scheduledFor);
      if (newScheduledDate.isBefore(dayjs())) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
      post.scheduled_for = newScheduledDate.toDate();

      // Re-queue with new delay
      await this.requeuePublishJob(post.id, newScheduledDate.diff(dayjs(), 'millisecond'));
    }

    if (dto.caption) post.caption = dto.caption;
    if (dto.mediaUrls) post.media_urls = dto.mediaUrls;
    if (dto.productTags) post.product_tags = dto.productTags;
    if (dto.locationId !== undefined) post.location_id = dto.locationId;

    post.updated_at = new Date();

    await this.scheduledPostRepository.save(post);

    return this.mapToDto(post);
  }

  /**
   * Cancel scheduled post
   */
  async cancelScheduledPost(postId: string, userId: string): Promise<void> {
    const post = await this.scheduledPostRepository.findOne({
      where: { id: postId, user_id: userId },
    });

    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (post.status !== 'scheduled') {
      throw new BadRequestException('Can only cancel scheduled posts');
    }

    post.status = 'cancelled';
    post.cancelled_at = new Date();

    await this.scheduledPostRepository.save(post);

    // Remove from queue
    await this.removeFromQueue(post.id);

    this.logger.log(`Scheduled post cancelled: ${post.id}`);
  }

  /**
   * Publish post immediately
   */
  async publishNow(postId: string, userId: string): Promise<any> {
    const post = await this.scheduledPostRepository.findOne({
      where: { id: postId, user_id: userId },
    });

    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (post.status !== 'scheduled') {
      throw new BadRequestException('Post is not in scheduled status');
    }

    // Remove from queue
    await this.removeFromQueue(post.id);

    // Publish immediately
    await this.executePublish(post.id);

    return this.mapToDto(post);
  }

  /**
   * Execute post publishing
   */
  async executePublish(postId: string): Promise<void> {
    this.logger.log(`Publishing post ${postId}`);

    const post = await this.scheduledPostRepository.findOne({ where: { id: postId } });

    if (!post) {
      this.logger.error(`Post not found: ${postId}`);
      return;
    }

    if (post.status !== 'scheduled') {
      this.logger.warn(`Post ${postId} is not in scheduled status: ${post.status}`);
      return;
    }

    // Update status
    post.status = 'publishing';
    post.publish_attempts += 1;
    await this.scheduledPostRepository.save(post);

    try {
      // Get account
      const account = await this.graphApiService.getAccountById(post.instagram_account_id);

      // Publish via Instagram Graph API
      const result = await this.graphApiService.createMediaPost(account.access_token, {
        caption: post.caption,
        mediaUrls: post.media_urls,
        mediaType: post.media_type,
        productTags: post.product_tags,
        locationId: post.location_id,
      });

      // Update post with Instagram data
      post.status = 'published';
      post.published_at = new Date();
      post.instagram_media_id = result.id;
      post.permalink = result.permalink;

      // Fetch initial metrics
      const insights = await this.graphApiService.getMediaInsights(account.access_token, result.id);
      if (insights) {
        post.initial_likes = insights.like_count || 0;
        post.initial_comments = insights.comments_count || 0;
        post.initial_reach = insights.reach || 0;
      }

      await this.scheduledPostRepository.save(post);

      this.logger.log(`Post published successfully: ${postId} -> ${result.id}`);

    } catch (error) {
      this.logger.error(`Failed to publish post ${postId}: ${error.message}`, error.stack);

      post.status = 'failed';
      post.last_publish_error = error.message;
      await this.scheduledPostRepository.save(post);

      // Retry if attempts < 3
      if (post.publish_attempts < 3) {
        this.logger.log(`Scheduling retry for post ${postId} (attempt ${post.publish_attempts + 1})`);
        await this.queuePublishJob(postId, 5 * 60 * 1000); // Retry in 5 minutes
      }
    }
  }

  /**
   * Queue publish job
   */
  private async queuePublishJob(postId: string, delay: number): Promise<void> {
    await this.publishQueue.add(
      'publish-post',
      { postId },
      {
        delay,
        jobId: `publish_${postId}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  /**
   * Re-queue publish job with new delay
   */
  private async requeuePublishJob(postId: string, delay: number): Promise<void> {
    // Remove existing job
    await this.removeFromQueue(postId);

    // Add new job
    await this.queuePublishJob(postId, delay);
  }

  /**
   * Remove from queue
   */
  private async removeFromQueue(postId: string): Promise<void> {
    const jobId = `publish_${postId}`;
    const job = await this.publishQueue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Removed job from queue: ${jobId}`);
    }
  }

  /**
   * Get optimal posting times
   */
  async getOptimalPostingTimes(accountId: string, userId: string): Promise<any> {
    const account = await this.graphApiService.getAccountWithToken(accountId, userId);

    // Get posting schedule
    const schedules = await this.scheduleRepository.find({
      where: { instagram_account_id: accountId },
      order: { day_of_week: 'ASC' },
    });

    // Analyze historical post performance
    const historicalPosts = await this.scheduledPostRepository.find({
      where: {
        instagram_account_id: accountId,
        status: 'published',
      },
      order: { published_at: 'DESC' },
      take: 100,
    });

    // Calculate engagement by hour and day
    const engagementByTime = this.analyzeEngagementPatterns(historicalPosts);

    return {
      schedules,
      recommendations: engagementByTime.slice(0, 5), // Top 5 optimal times
      timezone: account.timezone || 'UTC',
    };
  }

  /**
   * Analyze engagement patterns
   */
  private analyzeEngagementPatterns(posts: InstagramScheduledPost[]): any[] {
    const patterns: Map<string, { count: number; totalEngagement: number }> = new Map();

    for (const post of posts) {
      if (!post.published_at) continue;

      const date = dayjs(post.published_at);
      const dayOfWeek = date.day();
      const hour = date.hour();
      const key = `${dayOfWeek}-${hour}`;

      const engagement = (post.initial_likes || 0) + (post.initial_comments || 0) * 2;

      if (!patterns.has(key)) {
        patterns.set(key, { count: 0, totalEngagement: 0 });
      }

      const data = patterns.get(key)!;
      data.count += 1;
      data.totalEngagement += engagement;
    }

    // Convert to array and calculate average engagement
    const results = Array.from(patterns.entries()).map(([key, data]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return {
        dayOfWeek,
        hour,
        averageEngagement: data.totalEngagement / data.count,
        sampleSize: data.count,
      };
    });

    // Sort by average engagement
    results.sort((a, b) => b.averageEngagement - a.averageEngagement);

    return results;
  }

  /**
   * Process template
   */
  private processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, value);
    }

    return processed;
  }

  /**
   * Map entity to DTO
   */
  private mapToDto(post: InstagramScheduledPost): any {
    return {
      id: post.id,
      instagramAccountId: post.instagram_account_id,
      scheduledFor: post.scheduled_for,
      caption: post.caption,
      mediaUrls: post.media_urls,
      mediaType: post.media_type,
      status: post.status,
      publishAttempts: post.publish_attempts,
      instagramMediaId: post.instagram_media_id,
      permalink: post.permalink,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    };
  }
}
```

```typescript
// src/modules/instagram/services/instagram-media-upload.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstagramMediaAsset } from '../entities/instagram-media-asset.entity';
import { MinioService } from '../../storage/services/minio.service';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InstagramMediaUploadService {
  private readonly logger = new Logger(InstagramMediaUploadService.name);
  private readonly bucket: string;

  constructor(
    @InjectRepository(InstagramMediaAsset)
    private assetRepository: Repository<InstagramMediaAsset>,
    private minioService: MinioService,
    private configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET_INSTAGRAM', 'instagram-media');
  }

  /**
   * Upload media file
   */
  async uploadMedia(
    userId: string,
    file: Express.Multer.File,
    accountId?: string,
  ): Promise<any> {
    this.logger.log(`Uploading media for user ${userId}`);

    // Validate file type
    const mediaType = this.getMediaType(file.mimetype);

    if (!mediaType) {
      throw new BadRequestException('Invalid file type. Only images and videos are supported.');
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${fileExtension}`;
    const s3Key = `${userId}/${filename}`;

    // Upload to MinIO
    await this.minioService.uploadFile(this.bucket, s3Key, file.buffer, file.mimetype);

    const s3Url = await this.minioService.getFileUrl(this.bucket, s3Key);

    // Process metadata
    let metadata: any = {};

    if (mediaType === 'image') {
      metadata = await this.processImageMetadata(file.buffer);
    } else if (mediaType === 'video') {
      metadata = await this.processVideoMetadata(file.buffer, s3Key);
    }

    // Create asset record
    const asset = this.assetRepository.create({
      user_id: userId,
      instagram_account_id: accountId,
      filename,
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      media_type: mediaType,
      s3_bucket: this.bucket,
      s3_key: s3Key,
      s3_url: s3Url,
      width: metadata.width,
      height: metadata.height,
      duration: metadata.duration,
      thumbnail_url: metadata.thumbnailUrl,
    });

    await this.assetRepository.save(asset);

    this.logger.log(`Media uploaded: ${asset.id}`);

    return {
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mime_type,
      fileSize: asset.file_size,
      s3Url: asset.s3_url,
      thumbnailUrl: asset.thumbnail_url,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      createdAt: asset.created_at,
    };
  }

  /**
   * Get media type from MIME type
   */
  private getMediaType(mimeType: string): 'image' | 'video' | null {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return null;
  }

  /**
   * Process image metadata
   */
  private async processImageMetadata(buffer: Buffer): Promise<any> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      this.logger.error('Failed to process image metadata', error);
      return {};
    }
  }

  /**
   * Process video metadata and generate thumbnail
   */
  private async processVideoMetadata(buffer: Buffer, s3Key: string): Promise<any> {
    try {
      // Note: This is a simplified example. In production, you'd save the buffer to a temp file
      // and use ffmpeg to extract metadata and generate thumbnail

      return {
        duration: 0, // Extract from video
        thumbnailUrl: '', // Generate and upload thumbnail
      };
    } catch (error) {
      this.logger.error('Failed to process video metadata', error);
      return {};
    }
  }

  /**
   * List media assets
   */
  async listAssets(userId: string, accountId?: string): Promise<any[]> {
    const where: any = { user_id: userId };

    if (accountId) {
      where.instagram_account_id = accountId;
    }

    const assets = await this.assetRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: 100,
    });

    return assets.map(asset => ({
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mime_type,
      fileSize: asset.file_size,
      s3Url: asset.s3_url,
      thumbnailUrl: asset.thumbnail_url,
      width: asset.width,
      height: asset.height,
      mediaType: asset.media_type,
      createdAt: asset.created_at,
    }));
  }
}
```

---

### 4. Controller Implementation

```typescript
// src/modules/instagram/controllers/instagram-scheduling.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramSchedulingService } from '../services/instagram-scheduling.service';
import { InstagramMediaUploadService } from '../services/instagram-media-upload.service';
import { InstagramPostTemplatesService } from '../services/instagram-post-templates.service';
import {
  CreateScheduledPostDto,
  UpdateScheduledPostDto,
  ListScheduledPostsDto,
  ScheduledPostResponseDto,
} from '../dto/scheduled-post.dto';
import {
  CreatePostTemplateDto,
  UpdatePostTemplateDto,
} from '../dto/post-template.dto';

@ApiTags('Instagram Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('instagram/scheduling')
export class InstagramSchedulingController {
  constructor(
    private schedulingService: InstagramSchedulingService,
    private mediaUploadService: InstagramMediaUploadService,
    private templatesService: InstagramPostTemplatesService,
  ) {}

  // ========== Scheduled Posts ==========

  @Post('posts')
  @ApiOperation({ summary: 'Create scheduled post' })
  @ApiResponse({ status: 201, description: 'Post scheduled successfully', type: ScheduledPostResponseDto })
  async createScheduledPost(@Request() req, @Body() dto: CreateScheduledPostDto) {
    return this.schedulingService.createScheduledPost(req.user.id, dto);
  }

  @Get('posts/:accountId')
  @ApiOperation({ summary: 'List scheduled posts' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  async listScheduledPosts(
    @Request() req,
    @Param('accountId') accountId: string,
    @Query() dto: ListScheduledPostsDto,
  ) {
    return this.schedulingService.listScheduledPosts(req.user.id, accountId, dto);
  }

  @Get('posts/:accountId/:postId')
  @ApiOperation({ summary: 'Get scheduled post by ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully', type: ScheduledPostResponseDto })
  async getScheduledPost(@Request() req, @Param('postId') postId: string) {
    return this.schedulingService.getScheduledPost(postId, req.user.id);
  }

  @Put('posts/:postId')
  @ApiOperation({ summary: 'Update scheduled post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully', type: ScheduledPostResponseDto })
  async updateScheduledPost(
    @Request() req,
    @Param('postId') postId: string,
    @Body() dto: UpdateScheduledPostDto,
  ) {
    return this.schedulingService.updateScheduledPost(postId, req.user.id, dto);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: 'Cancel scheduled post' })
  @ApiResponse({ status: 200, description: 'Post cancelled successfully' })
  async cancelScheduledPost(@Request() req, @Param('postId') postId: string) {
    await this.schedulingService.cancelScheduledPost(postId, req.user.id);
    return { message: 'Post cancelled successfully' };
  }

  @Post('posts/:postId/publish-now')
  @ApiOperation({ summary: 'Publish post immediately' })
  @ApiResponse({ status: 200, description: 'Post published successfully' })
  async publishNow(@Request() req, @Param('postId') postId: string) {
    return this.schedulingService.publishNow(postId, req.user.id);
  }

  // ========== Media Upload ==========

  @Post('media/upload')
  @ApiOperation({ summary: 'Upload media file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Query('accountId') accountId?: string,
  ) {
    return this.mediaUploadService.uploadMedia(req.user.id, file, accountId);
  }

  @Get('media/:accountId')
  @ApiOperation({ summary: 'List media assets' })
  @ApiResponse({ status: 200, description: 'Media assets retrieved successfully' })
  async listMedia(@Request() req, @Param('accountId') accountId?: string) {
    return this.mediaUploadService.listAssets(req.user.id, accountId);
  }

  // ========== Templates ==========

  @Post('templates')
  @ApiOperation({ summary: 'Create post template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Request() req, @Body() dto: CreatePostTemplateDto) {
    return this.templatesService.createTemplate(req.user.id, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List post templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async listTemplates(@Request() req, @Query('category') category?: string) {
    return this.templatesService.listTemplates(req.user.id, category);
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Request() req,
    @Param('templateId') templateId: string,
    @Body() dto: UpdatePostTemplateDto,
  ) {
    return this.templatesService.updateTemplate(templateId, req.user.id, dto);
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(@Request() req, @Param('templateId') templateId: string) {
    await this.templatesService.deleteTemplate(templateId, req.user.id);
    return { message: 'Template deleted successfully' };
  }

  // ========== Optimal Times ==========

  @Get('optimal-times/:accountId')
  @ApiOperation({ summary: 'Get optimal posting times' })
  @ApiResponse({ status: 200, description: 'Optimal times retrieved successfully' })
  async getOptimalTimes(@Request() req, @Param('accountId') accountId: string) {
    return this.schedulingService.getOptimalPostingTimes(accountId, req.user.id);
  }
}
```

---

### 5. BullMQ Queue Processor

```typescript
// src/modules/instagram/processors/instagram-publishing.processor.ts

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InstagramSchedulingService } from '../services/instagram-scheduling.service';

@Processor('instagram-publishing')
export class InstagramPublishingProcessor {
  private readonly logger = new Logger(InstagramPublishingProcessor.name);

  constructor(private schedulingService: InstagramSchedulingService) {}

  @Process('publish-post')
  async handlePublish(job: Job) {
    this.logger.log(`Processing publish job ${job.id}`);

    const { postId } = job.data;

    try {
      await this.schedulingService.executePublish(postId);
      this.logger.log(`Post published successfully: ${postId}`);
    } catch (error) {
      this.logger.error(`Failed to publish post ${postId}: ${error.message}`, error.stack);
      throw error; // Let BullMQ handle retry
    }
  }
}
```

---

(Continuing with API examples, testing, and acceptance criteria...)

### 6. API Examples

#### Upload Media
```bash
curl -X POST "http://localhost:3000/api/instagram/scheduling/media/upload?accountId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

#### Create Scheduled Post
```bash
curl -X POST "http://localhost:3000/api/instagram/scheduling/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "scheduledFor": "2025-01-20T14:00:00Z",
    "caption": "Check out our new product! 🎉 #newlaunch #product",
    "mediaUrls": ["https://s3.amazonaws.com/bucket/media.jpg"],
    "mediaType": "IMAGE"
  }'
```

#### Create Post with Template
```bash
curl -X POST "http://localhost:3000/api/instagram/scheduling/posts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "scheduledFor": "2025-01-20T14:00:00Z",
    "caption": "",
    "mediaUrls": ["https://s3.amazonaws.com/bucket/media.jpg"],
    "mediaType": "IMAGE",
    "templateId": "660e8400-e29b-41d4-a716-446655440000",
    "templateVariables": {
      "productName": "Premium Course",
      "discount": "20%",
      "endDate": "Jan 31"
    }
  }'
```

#### List Scheduled Posts
```bash
curl -X GET "http://localhost:3000/api/instagram/scheduling/posts/550e8400-e29b-41d4-a716-446655440000?status=scheduled&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Scheduled Post
```bash
curl -X PUT "http://localhost:3000/api/instagram/scheduling/posts/660e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledFor": "2025-01-21T15:00:00Z",
    "caption": "Updated caption with new hashtags! #updated"
  }'
```

#### Publish Now
```bash
curl -X POST "http://localhost:3000/api/instagram/scheduling/posts/660e8400-e29b-41d4-a716-446655440000/publish-now" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create Template
```bash
curl -X POST "http://localhost:3000/api/instagram/scheduling/templates" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Launch",
    "category": "product_launch",
    "captionTemplate": "Introducing {{productName}}! 🎉\n\nGet {{discount}} off until {{endDate}}!\n\nLink in bio 👆",
    "suggestedHashtags": ["newproduct", "launch", "sale"],
    "suggestedMentions": ["yourbrand"],
    "defaultMediaType": "IMAGE"
  }'
```

#### Get Optimal Times
```bash
curl -X GET "http://localhost:3000/api/instagram/scheduling/optimal-times/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Acceptance Criteria

### Functional Requirements

1. **Post Scheduling**
   - [ ] Schedule posts for future publication
   - [ ] Support images, videos, carousels, and reels
   - [ ] Minimum 5 minutes in future required
   - [ ] Maximum 6 months in future allowed
   - [ ] Automatic publication at scheduled time
   - [ ] Support multiple posts per day

2. **Media Management**
   - [ ] Upload images via API
   - [ ] Upload videos via API
   - [ ] Store media in MinIO S3
   - [ ] Generate thumbnails for videos
   - [ ] Extract image dimensions
   - [ ] Extract video duration
   - [ ] Support JPG, PNG, MP4, MOV formats

3. **Template System**
   - [ ] Create caption templates
   - [ ] Variable substitution ({{var}})
   - [ ] Suggested hashtags
   - [ ] Suggested mentions
   - [ ] Template categories
   - [ ] Track template usage
   - [ ] Update templates

4. **Post Management**
   - [ ] List scheduled posts
   - [ ] Filter by status
   - [ ] Filter by date range
   - [ ] Update scheduled posts
   - [ ] Cancel scheduled posts
   - [ ] Publish immediately
   - [ ] View post details

5. **Publishing**
   - [ ] Auto-publish at scheduled time
   - [ ] Retry failed publications (max 3 attempts)
   - [ ] Track publication status
   - [ ] Store Instagram media ID
   - [ ] Store permalink
   - [ ] Capture initial metrics
   - [ ] Handle API errors gracefully

6. **Optimal Timing**
   - [ ] Analyze historical performance
   - [ ] Suggest best posting times
   - [ ] Group by day and hour
   - [ ] Calculate engagement scores
   - [ ] Show top 5 optimal slots
   - [ ] Support custom posting schedules

### Technical Requirements

7. **Database**
   - [ ] Scheduled posts table
   - [ ] Post templates table
   - [ ] Media assets table
   - [ ] Posting schedules table
   - [ ] Proper indexes for queries
   - [ ] Foreign key constraints

8. **Queue Processing**
   - [ ] BullMQ delayed jobs
   - [ ] Job scheduled at exact time
   - [ ] Retry with exponential backoff
   - [ ] Remove job on cancel
   - [ ] Update job on reschedule
   - [ ] Handle job failures

9. **Storage**
   - [ ] MinIO S3 integration
   - [ ] Unique file naming
   - [ ] Organized folder structure
   - [ ] Presigned URLs for access
   - [ ] File size limits enforced
   - [ ] MIME type validation

10. **Performance**
    - [ ] Post creation < 500ms
    - [ ] Media upload < 5s (10MB file)
    - [ ] List posts < 200ms
    - [ ] Template rendering < 100ms
    - [ ] Publishing < 10s

11. **Security**
    - [ ] JWT authentication required
    - [ ] User can only access their posts
    - [ ] File upload validation
    - [ ] SQL injection prevention
    - [ ] XSS prevention in captions

### Quality Requirements

12. **Error Handling**
    - [ ] Invalid schedule time rejected
    - [ ] Missing media URLs rejected
    - [ ] Invalid file types rejected
    - [ ] Instagram API errors logged
    - [ ] Failed publications tracked
    - [ ] User-friendly error messages

13. **Validation**
    - [ ] DTO validation with class-validator
    - [ ] Date format validation
    - [ ] Media type validation
    - [ ] Caption length limits
    - [ ] Hashtag format validation

14. **Documentation**
    - [ ] Swagger API documentation
    - [ ] All endpoints documented
    - [ ] Request/response examples
    - [ ] curl examples provided
    - [ ] Setup guide included

15. **Testing**
    - [ ] Unit tests (>80% coverage)
    - [ ] Integration tests
    - [ ] E2E tests for scheduling flow
    - [ ] Mock Instagram API
    - [ ] Test retry logic

16. **Monitoring**
    - [ ] Log all publications
    - [ ] Log failed attempts
    - [ ] Track queue metrics
    - [ ] Alert on failures
    - [ ] Monitor storage usage

### User Experience

17. **Response Times**
    - [ ] Schedule post < 500ms
    - [ ] Upload media < 5s
    - [ ] List posts < 200ms
    - [ ] Optimal times < 1s

18. **Data Accuracy**
    - [ ] Exact publication time
    - [ ] Correct template rendering
    - [ ] Accurate initial metrics
    - [ ] Proper status tracking

19. **Scalability**
    - [ ] Support 1000+ scheduled posts per account
    - [ ] Handle 100+ concurrent uploads
    - [ ] Efficient pagination
    - [ ] Optimized database queries

20. **Maintenance**
    - [ ] Clear code structure
    - [ ] Comprehensive logging
    - [ ] Database migrations
    - [ ] Easy configuration
    - [ ] Environment variables

---

## Dependencies

- **IG-001**: Instagram OAuth
- **IG-002**: Instagram accounts
- **Database**: PostgreSQL
- **Queue**: BullMQ + Redis
- **Storage**: MinIO S3
- **Image Processing**: Sharp
- **Video Processing**: FFmpeg (optional)

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/instagram/scheduling/posts` | Create scheduled post |
| GET | `/instagram/scheduling/posts/:accountId` | List scheduled posts |
| GET | `/instagram/scheduling/posts/:accountId/:postId` | Get post details |
| PUT | `/instagram/scheduling/posts/:postId` | Update scheduled post |
| DELETE | `/instagram/scheduling/posts/:postId` | Cancel scheduled post |
| POST | `/instagram/scheduling/posts/:postId/publish-now` | Publish immediately |
| POST | `/instagram/scheduling/media/upload` | Upload media |
| GET | `/instagram/scheduling/media/:accountId` | List media assets |
| POST | `/instagram/scheduling/templates` | Create template |
| GET | `/instagram/scheduling/templates` | List templates |
| PUT | `/instagram/scheduling/templates/:id` | Update template |
| DELETE | `/instagram/scheduling/templates/:id` | Delete template |
| GET | `/instagram/scheduling/optimal-times/:accountId` | Get optimal times |

---

## Environment Variables

```bash
# MinIO S3
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_INSTAGRAM=instagram-media

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# File Upload
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

---

## Notes

- Instagram requires posts to be published within 24 hours of media upload
- Video posts may take longer to process
- Carousel posts require all media uploaded to same container
- Reels have specific aspect ratio requirements (9:16)
- Caption max length: 2,200 characters
- Max 30 hashtags per post
- Max 20 user tags per post

---

## Estimated Effort

- **Database Design & Migrations**: 4 hours
- **DTOs & Validation**: 3 hours
- **Scheduling Service**: 10 hours
- **Media Upload Service**: 6 hours
- **Template Service**: 4 hours
- **Controller Implementation**: 4 hours
- **Queue Processing**: 4 hours
- **Testing**: 8 hours
- **Documentation**: 2 hours
- **Total**: ~45 hours (13 story points)
