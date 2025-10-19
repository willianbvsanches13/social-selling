import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CreateScheduledPostDto, UpdateScheduledPostDto, ListScheduledPostsDto, ScheduledPostResponseDto, PostStatus } from '../dto/scheduled-post.dto';
import { InstagramScheduledPost, PostMediaType } from '../../../domain/entities/instagram-scheduled-post.entity';
import { InstagramPostTemplate } from '../../../domain/entities/instagram-post-template.entity';
import { InstagramPostingSchedule } from '../../../domain/entities/instagram-posting-schedule.entity';
import { InstagramApiService } from './instagram-api.service';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface IScheduledPostRepository {
  create(post: InstagramScheduledPost): Promise<InstagramScheduledPost>;
  findById(id: string): Promise<InstagramScheduledPost | null>;
  findByClientAccount(clientAccountId: string): Promise<InstagramScheduledPost[]>;
  update(post: InstagramScheduledPost): Promise<InstagramScheduledPost>;
  delete(id: string): Promise<void>;
  findScheduledForPublishing(now: Date): Promise<InstagramScheduledPost[]>;
  list(clientAccountId: string, filters?: any): Promise<{ items: InstagramScheduledPost[]; total: number }>;
}

export interface IPostTemplateRepository {
  create(template: InstagramPostTemplate): Promise<InstagramPostTemplate>;
  findById(id: string): Promise<InstagramPostTemplate | null>;
  findByUser(userId: string): Promise<InstagramPostTemplate[]>;
  update(template: InstagramPostTemplate): Promise<InstagramPostTemplate>;
  delete(id: string): Promise<void>;
}

export interface IPostingScheduleRepository {
  create(schedule: InstagramPostingSchedule): Promise<InstagramPostingSchedule>;
  findById(id: string): Promise<InstagramPostingSchedule | null>;
  findByClientAccount(clientAccountId: string): Promise<InstagramPostingSchedule[]>;
  update(schedule: InstagramPostingSchedule): Promise<InstagramPostingSchedule>;
  findByClientAccountAndDay(clientAccountId: string, dayOfWeek: number): Promise<InstagramPostingSchedule | null>;
}

@Injectable()
export class InstagramSchedulingService {
  private readonly logger = new Logger(InstagramSchedulingService.name);

  constructor(
    @Inject('IScheduledPostRepository')
    private readonly scheduledPostRepository: IScheduledPostRepository,
    @Inject('IPostTemplateRepository')
    private readonly templateRepository: IPostTemplateRepository,
    @Inject('IPostingScheduleRepository')
    private readonly scheduleRepository: IPostingScheduleRepository,
    @Inject('IClientAccountRepository')
    private readonly accountRepository: IClientAccountRepository,
    private readonly instagramApi: InstagramApiService,
    @InjectQueue('instagram-publishing')
    private readonly publishQueue: Queue,
  ) {}

  /**
   * Create scheduled post
   */
  async createScheduledPost(userId: string, dto: CreateScheduledPostDto): Promise<ScheduledPostResponseDto> {
    this.logger.log(`Creating scheduled post for user ${userId}`);

    // Validate scheduled time is in future
    const scheduledDate = dayjs(dto.scheduledFor);
    if (scheduledDate.isBefore(dayjs())) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Validate not too far in future (max 6 months)
    const maxFutureDate = dayjs().add(6, 'months');
    if (scheduledDate.isAfter(maxFutureDate)) {
      throw new BadRequestException('Cannot schedule posts more than 6 months in advance');
    }

    // Get and verify Instagram account
    const account = await this.accountRepository.findById(dto.clientAccountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Instagram account not found');
    }

    // Process template if provided
    let caption = dto.caption;
    if (dto.templateId) {
      const template = await this.templateRepository.findById(dto.templateId);
      if (!template || template.userId !== userId) {
        throw new NotFoundException('Template not found');
      }

      // Process template with variable substitution
      caption = template.processCaption(dto.templateVariables || {});

      // Add suggested hashtags and mentions
      if (template.suggestedHashtags && template.suggestedHashtags.length > 0) {
        caption += '\n\n' + template.suggestedHashtags.map((tag) => `#${tag}`).join(' ');
      }

      if (template.suggestedMentions && template.suggestedMentions.length > 0) {
        caption += '\n' + template.suggestedMentions.map((mention) => `@${mention}`).join(' ');
      }

      // Record template usage
      template.recordUsage();
      await this.templateRepository.update(template);
    }

    // Validate media URLs
    if (!dto.mediaUrls || dto.mediaUrls.length === 0) {
      throw new BadRequestException('At least one media URL is required');
    }

    // Create scheduled post entity
    const scheduledPost = InstagramScheduledPost.create({
      clientAccountId: dto.clientAccountId,
      userId,
      scheduledFor: scheduledDate.toDate(),
      caption,
      mediaUrls: dto.mediaUrls,
      mediaType: dto.mediaType,
      productTags: dto.productTags,
      locationId: dto.locationId,
      templateId: dto.templateId,
      templateVariables: dto.templateVariables || {},
    });

    // Save to database
    const saved = await this.scheduledPostRepository.create(scheduledPost);

    // Queue for publishing
    const delay = scheduledDate.diff(dayjs(), 'millisecond');
    await this.queuePublishJob(saved.id, delay);

    this.logger.log(`Scheduled post created: ${saved.id}, publishing in ${delay}ms`);

    return this.mapToDto(saved);
  }

  /**
   * List scheduled posts with filters
   */
  async listScheduledPosts(
    userId: string,
    accountId: string,
    dto: ListScheduledPostsDto,
  ): Promise<{ posts: ScheduledPostResponseDto[]; total: number; page: number; limit: number }> {
    // Verify account access
    const account = await this.accountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Instagram account not found');
    }

    const { page = 1, limit = 20, status, scheduledAfter, scheduledBefore } = dto;

    const filters: any = {};
    if (status) {
      filters.status = status;
    }
    if (scheduledAfter) {
      filters.scheduledAfter = dayjs(scheduledAfter).toDate();
    }
    if (scheduledBefore) {
      filters.scheduledBefore = dayjs(scheduledBefore).toDate();
    }

    const { items, total } = await this.scheduledPostRepository.list(accountId, {
      ...filters,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      posts: items.map((p) => this.mapToDto(p)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get scheduled post by ID
   */
  async getScheduledPost(postId: string, userId: string): Promise<ScheduledPostResponseDto> {
    const post = await this.scheduledPostRepository.findById(postId);

    if (!post || post.userId !== userId) {
      throw new NotFoundException('Scheduled post not found');
    }

    return this.mapToDto(post);
  }

  /**
   * Update scheduled post
   */
  async updateScheduledPost(
    postId: string,
    userId: string,
    dto: UpdateScheduledPostDto,
  ): Promise<ScheduledPostResponseDto> {
    const post = await this.scheduledPostRepository.findById(postId);

    if (!post || post.userId !== userId) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (!post.isScheduled) {
      throw new BadRequestException('Can only update scheduled posts');
    }

    // Update scheduled time if provided
    if (dto.scheduledFor) {
      const newScheduledDate = dayjs(dto.scheduledFor);
      if (newScheduledDate.isBefore(dayjs())) {
        throw new BadRequestException('Scheduled time must be in the future');
      }

      post.updateScheduledTime(newScheduledDate.toDate());

      // Re-queue with new delay
      await this.removeFromQueue(post.id);
      const delay = newScheduledDate.diff(dayjs(), 'millisecond');
      await this.queuePublishJob(post.id, delay);
    }

    // Update other fields
    if (dto.caption) {
      post.updateCaption(dto.caption);
    }

    if (dto.mediaUrls) {
      post.updateMediaUrls(dto.mediaUrls);
    }

    // Update product tags if provided
    if (dto.productTags !== undefined) {
      const updatedPost = post.toJSON();
      updatedPost.productTags = dto.productTags;
    }

    // Save updated post
    const updated = await this.scheduledPostRepository.update(post);

    return this.mapToDto(updated);
  }

  /**
   * Cancel scheduled post
   */
  async cancelScheduledPost(postId: string, userId: string): Promise<void> {
    const post = await this.scheduledPostRepository.findById(postId);

    if (!post || post.userId !== userId) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (!post.isScheduled) {
      throw new BadRequestException('Can only cancel scheduled posts');
    }

    post.markAsCancelled();
    await this.scheduledPostRepository.update(post);

    // Remove from queue
    await this.removeFromQueue(post.id);

    this.logger.log(`Scheduled post cancelled: ${post.id}`);
  }

  /**
   * Publish post immediately
   */
  async publishNow(postId: string, userId: string): Promise<ScheduledPostResponseDto> {
    const post = await this.scheduledPostRepository.findById(postId);

    if (!post || post.userId !== userId) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (!post.isScheduled) {
      throw new BadRequestException('Post is not in scheduled status');
    }

    // Remove from queue
    await this.removeFromQueue(post.id);

    // Publish immediately
    await this.executePublish(post.id);

    const updated = await this.scheduledPostRepository.findById(post.id);
    if (!updated) {
      throw new NotFoundException('Post not found after publishing');
    }

    return this.mapToDto(updated);
  }

  /**
   * Execute post publishing (called by BullMQ processor)
   */
  async executePublish(postId: string): Promise<void> {
    this.logger.log(`Publishing post ${postId}`);

    const post = await this.scheduledPostRepository.findById(postId);

    if (!post) {
      this.logger.error(`Post not found: ${postId}`);
      return;
    }

    if (!post.isScheduled) {
      this.logger.warn(`Post ${postId} is not in scheduled status: ${post.status}`);
      return;
    }

    // Update status
    post.markAsPublishing();
    await this.scheduledPostRepository.update(post);

    try {
      // Get account
      const account = await this.accountRepository.findById(post.clientAccountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // TODO: Implement actual Instagram Graph API publishing
      // This requires the createMediaPost method in InstagramApiService
      // Placeholder implementation
      const result = {
        id: `instagram_${post.id}`,
        permalink: `https://instagram.com/p/${post.id}`,
      };

      // Update post with Instagram data
      post.markAsPublished(result.id, result.permalink);

      // Fetch initial metrics (placeholder)
      try {
        // TODO: Fetch actual insights from Instagram API
        post.setInitialMetrics(0, 0, 0);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to fetch insights for post ${postId}: ${errorMessage}`);
      }

      await this.scheduledPostRepository.update(post);

      this.logger.log(`Post published successfully: ${postId} -> ${result.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Failed to publish post ${postId}: ${errorMessage}`, errorStack);

      post.markAsFailed(errorMessage);
      await this.scheduledPostRepository.update(post);

      // Retry if attempts < 3
      if (post.canRetry(3)) {
        this.logger.log(`Scheduling retry for post ${postId} (attempt ${post.publishAttempts + 1})`);
        await this.queuePublishJob(postId, 5 * 60 * 1000); // Retry in 5 minutes
      }
    }
  }

  /**
   * Get optimal posting times
   */
  async getOptimalPostingTimes(accountId: string, userId: string): Promise<any> {
    // Verify account access
    const account = await this.accountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Instagram account not found');
    }

    // Get posting schedules
    const schedules = await this.scheduleRepository.findByClientAccount(accountId);

    // Get historical posts
    const historicalPosts = await this.scheduledPostRepository.findByClientAccount(accountId);
    const publishedPosts = historicalPosts.filter((p) => p.isPublished);

    // Analyze engagement patterns
    const engagementByTime = this.analyzeEngagementPatterns(publishedPosts);

    return {
      schedules,
      recommendations: engagementByTime.slice(0, 5), // Top 5 optimal times
      timezone: 'UTC', // Default timezone
      postsAnalyzed: publishedPosts.length,
      analysisPeriodDays: 90,
    };
  }

  /**
   * Analyze engagement patterns from historical posts
   */
  private analyzeEngagementPatterns(posts: InstagramScheduledPost[]): any[] {
    const patterns: Map<string, { count: number; totalEngagement: number }> = new Map();

    for (const post of posts) {
      if (!post.toJSON().publishedAt) continue;

      const date = dayjs(post.toJSON().publishedAt);
      const dayOfWeek = date.day();
      const hour = date.hour();
      const key = `${dayOfWeek}-${hour}`;

      const props = post.toJSON();
      const engagement = (props.initialLikes || 0) + (props.initialComments || 0) * 2;

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

    // Sort by average engagement descending
    results.sort((a, b) => b.averageEngagement - a.averageEngagement);

    return results;
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
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  }

  /**
   * Remove job from queue
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
   * Map entity to DTO
   */
  private mapToDto(post: InstagramScheduledPost): ScheduledPostResponseDto {
    const props = post.toJSON();
    return {
      id: post.id,
      clientAccountId: post.clientAccountId,
      userId: post.userId,
      scheduledFor: post.scheduledFor,
      publishedAt: props.publishedAt,
      caption: post.caption,
      mediaUrls: post.mediaUrls,
      mediaType: post.mediaType,
      status: post.status,
      publishAttempts: post.publishAttempts,
      lastPublishError: props.lastPublishError,
      instagramMediaId: props.instagramMediaId,
      permalink: props.permalink,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      cancelledAt: props.cancelledAt,
    };
  }
}
