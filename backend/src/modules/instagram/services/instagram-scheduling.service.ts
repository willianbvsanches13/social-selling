import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  CreateScheduledPostDto,
  UpdateScheduledPostDto,
  ListScheduledPostsDto,
  ScheduledPostResponseDto,
  PostStatus,
} from '../dto/scheduled-post.dto';
import {
  InstagramScheduledPost,
  PostMediaType,
} from '../../../domain/entities/instagram-scheduled-post.entity';
import { InstagramPostTemplate } from '../../../domain/entities/instagram-post-template.entity';
import { InstagramPostingSchedule } from '../../../domain/entities/instagram-posting-schedule.entity';
import { InstagramApiService } from './instagram-api.service';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository.interface';
import { IInstagramScheduledPostRepository } from '../../../domain/repositories/instagram-scheduled-post.repository.interface';
import { IInstagramPostTemplateRepository } from '../../../domain/repositories/instagram-post-template.repository.interface';
import { IInstagramPostingScheduleRepository } from '../../../domain/repositories/instagram-posting-schedule.repository.interface';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class InstagramSchedulingService {
  private readonly logger = new Logger(InstagramSchedulingService.name);

  constructor(
    @Inject('IInstagramScheduledPostRepository')
    private readonly scheduledPostRepository: IInstagramScheduledPostRepository,
    @Inject('IInstagramPostTemplateRepository')
    private readonly templateRepository: IInstagramPostTemplateRepository,
    @Inject('IInstagramPostingScheduleRepository')
    private readonly scheduleRepository: IInstagramPostingScheduleRepository,
    @Inject('IClientAccountRepository')
    private readonly accountRepository: IClientAccountRepository,
    @Inject('IOAuthTokenRepository')
    private readonly oauthTokenRepository: IOAuthTokenRepository,
    private readonly configService: ConfigService,
    private readonly instagramApi: InstagramApiService,
    @InjectQueue('instagram-post-publishing')
    private readonly publishQueue: Queue,
  ) {}

  /**
   * Create scheduled post
   */
  async createScheduledPost(
    userId: string,
    dto: CreateScheduledPostDto,
  ): Promise<ScheduledPostResponseDto> {
    this.logger.log(`Creating scheduled post for user ${userId}`);

    // Validate scheduled time is in future
    // Add 5-minute buffer to account for timezone differences and processing time
    this.logger.log(`Received scheduledFor: ${dto.scheduledFor}`);
    this.logger.log(`Current UTC time: ${dayjs().utc().format()}`);

    const scheduledDate = dayjs(dto.scheduledFor).utc();
    const now = dayjs().utc().subtract(5, 'minutes');

    this.logger.log(`Parsed scheduled date (UTC): ${scheduledDate.format()}`);
    this.logger.log(`Now minus 5 min (UTC): ${now.format()}`);
    this.logger.log(`Is before? ${scheduledDate.isBefore(now)}`);

    if (scheduledDate.isBefore(now)) {
      throw new BadRequestException(
        'Scheduled time must be at least 5 minutes in the future',
      );
    }

    // Validate not too far in future (max 6 months)
    const maxFutureDate = dayjs().add(6, 'months');
    if (scheduledDate.isAfter(maxFutureDate)) {
      throw new BadRequestException(
        'Cannot schedule posts more than 6 months in advance',
      );
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
        caption +=
          '\n\n' + template.suggestedHashtags.map((tag) => `#${tag}`).join(' ');
      }

      if (template.suggestedMentions && template.suggestedMentions.length > 0) {
        caption +=
          '\n' +
          template.suggestedMentions.map((mention) => `@${mention}`).join(' ');
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

    this.logger.log(
      `Scheduled post created: ${saved.id}, publishing in ${delay}ms`,
    );

    return this.mapToDto(saved);
  }

  /**
   * List scheduled posts with filters
   */
  async listScheduledPosts(
    userId: string,
    accountId: string,
    dto: ListScheduledPostsDto,
  ): Promise<{
    posts: ScheduledPostResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Verify account access
    const account = await this.accountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Instagram account not found');
    }

    const {
      page = 1,
      limit = 20,
      status,
      scheduledAfter,
      scheduledBefore,
    } = dto;

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

    const { items, total } = await this.scheduledPostRepository.list(
      accountId,
      {
        ...filters,
        skip: (page - 1) * limit,
        take: limit,
      },
    );

    return {
      posts: items.map((p) => this.mapToDto(p)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get posts for calendar view (date range)
   */
  async getCalendarPosts(
    userId: string,
    startDate: string,
    endDate: string,
    clientAccountId?: string,
  ): Promise<ScheduledPostResponseDto[]> {
    // Validate dates
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (!start.isValid() || !end.isValid()) {
      throw new BadRequestException('Invalid date format');
    }

    if (end.isBefore(start)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Verify account access if provided
    if (clientAccountId) {
      const account = await this.accountRepository.findById(clientAccountId);
      if (!account || account.userId !== userId) {
        throw new NotFoundException('Instagram account not found');
      }
    }

    const filters: any = {
      scheduledAfter: start.toDate(),
      scheduledBefore: end.toDate(),
    };

    // Get all posts in date range
    let posts: InstagramScheduledPost[];
    if (clientAccountId) {
      const { items } = await this.scheduledPostRepository.list(
        clientAccountId,
        filters,
      );
      posts = items;
    } else {
      // Get posts from all user's accounts
      const accounts = await this.accountRepository.findByUserId(userId);
      posts = [];
      for (const account of accounts) {
        const { items } = await this.scheduledPostRepository.list(
          account.id,
          filters,
        );
        posts.push(...items);
      }
    }

    // Sort by scheduled time
    posts.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

    return posts.map((p) => this.mapToDto(p));
  }

  /**
   * Get scheduled post by ID
   */
  async getScheduledPost(
    postId: string,
    userId: string,
  ): Promise<ScheduledPostResponseDto> {
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
      // Add 5-minute buffer to account for timezone differences and processing time
      const newScheduledDate = dayjs(dto.scheduledFor).utc();
      const now = dayjs().utc().subtract(5, 'minutes');
      if (newScheduledDate.isBefore(now)) {
        throw new BadRequestException(
          'Scheduled time must be at least 5 minutes in the future',
        );
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
   * Publish post immediately (from scheduled post)
   */
  async publishNow(
    postId: string,
    userId: string,
  ): Promise<ScheduledPostResponseDto> {
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
   * Publish post instantly without scheduling
   */
  async publishInstantly(
    userId: string,
    dto: CreateScheduledPostDto,
  ): Promise<ScheduledPostResponseDto> {
    this.logger.log(`Publishing post instantly for user ${userId}`);

    // Get and verify Instagram account
    const account = await this.accountRepository.findById(dto.clientAccountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Instagram account not found');
    }

    // Use caption from DTO
    const caption = dto.caption;

    // Create post with immediate scheduling (now)
    const post = InstagramScheduledPost.create({
      clientAccountId: dto.clientAccountId,
      userId,
      scheduledFor: new Date(), // Schedule for immediate execution
      caption,
      mediaUrls: dto.mediaUrls,
      mediaType: dto.mediaType as PostMediaType,
      locationId: dto.locationId,
      templateId: dto.templateId,
    });

    const saved = await this.scheduledPostRepository.create(post);

    // Publish immediately without queue
    try {
      await this.executePublish(saved.id);

      const updated = await this.scheduledPostRepository.findById(saved.id);
      if (!updated) {
        throw new NotFoundException('Post not found after publishing');
      }

      return this.mapToDto(updated);
    } catch (error) {
      this.logger.error(
        `Failed to publish instantly: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
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
      this.logger.warn(
        `Post ${postId} is not in scheduled status: ${post.status}`,
      );
      return;
    }

    // Update status
    post.markAsPublishing();
    await this.scheduledPostRepository.update(post);

    try {
      // Get account
      const account = await this.accountRepository.findById(
        post.clientAccountId,
      );
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to fetch insights for post ${postId}: ${errorMessage}`,
        );
      }

      await this.scheduledPostRepository.update(post);

      this.logger.log(`Post published successfully: ${postId} -> ${result.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `Failed to publish post ${postId}: ${errorMessage}`,
        errorStack,
      );

      post.markAsFailed(errorMessage);
      await this.scheduledPostRepository.update(post);

      // Retry if attempts < 3
      if (post.canRetry(3)) {
        this.logger.log(
          `Scheduling retry for post ${postId} (attempt ${post.publishAttempts + 1})`,
        );
        await this.queuePublishJob(postId, 5 * 60 * 1000); // Retry in 5 minutes
      }
    }
  }

  /**
   * Get optimal posting times
   */
  async getOptimalPostingTimes(
    accountId: string,
    userId: string,
  ): Promise<any> {
    // Verify account access
    const account = await this.accountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Instagram account not found');
    }

    // Get posting schedules
    const schedules =
      await this.scheduleRepository.findByClientAccount(accountId);

    // Get historical posts
    const historicalPosts =
      await this.scheduledPostRepository.findByClientAccount(accountId);
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
    const patterns: Map<string, { count: number; totalEngagement: number }> =
      new Map();

    for (const post of posts) {
      if (!post.toJSON().publishedAt) continue;

      const date = dayjs(post.toJSON().publishedAt);
      const dayOfWeek = date.day();
      const hour = date.hour();
      const key = `${dayOfWeek}-${hour}`;

      const props = post.toJSON();
      const engagement =
        (props.initialLikes || 0) + (props.initialComments || 0) * 2;

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
    // Fetch the post to get all required data
    const post = await this.scheduledPostRepository.findById(postId);
    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    const postData = post.toJSON();

    await this.publishQueue.add(
      'publish-post',
      {
        postId: post.id,
        userId: post.userId,
        accountId: post.clientAccountId,
        caption: post.caption,
        mediaUrls: post.mediaUrls,
        mediaType: post.mediaType,
        scheduledFor: post.scheduledFor,
        publishTime: new Date(),
        hashtags: [],
        location: postData.locationId
          ? { id: postData.locationId, name: '' }
          : undefined,
        firstComment: undefined,
        userTags: [],
        metadata: {
          retryCount: post.publishAttempts,
          originalScheduledTime: post.scheduledFor,
        },
      },
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

  /**
   * Test publish - executes the same logic as worker but synchronously with detailed logs
   */
  async testPublish(postId: string, userId: string): Promise<any> {
    const logs: string[] = [];

    try {
      logs.push(`[1] Starting test publish for post ${postId}`);

      // Get post
      const post = await this.scheduledPostRepository.findById(postId);
      if (!post || post.userId !== userId) {
        throw new NotFoundException('Scheduled post not found');
      }
      logs.push(`[2] Post found: ${post.caption.substring(0, 50)}...`);

      // Get account
      const account = await this.accountRepository.findById(
        post.clientAccountId,
      );
      if (!account) {
        throw new Error('Account not found');
      }
      logs.push(`[3] Account found: @${account.username} (${account.id})`);
      logs.push(`[4] Platform Account ID: ${account.platformAccountId}`);
      logs.push(`[5] Account Type: ${account.accountType}`);
      logs.push(`[6] Account Status: ${account.status}`);

      // Get access token
      const token = await this.oauthTokenRepository.findByClientAccountId(
        post.clientAccountId,
      );
      let accessToken: string | null = null;

      if (token) {
        logs.push(`[7] OAuth token found in database`);
        logs.push(`[8] Token expires at: ${token.expiresAt}`);
        logs.push(`[9] Token is expired: ${token.isExpired}`);

        if (!token.isExpired) {
          accessToken = token.encryptedAccessToken;
          logs.push(`[10] Using OAuth token from database`);
        } else {
          logs.push(`[10] OAuth token is expired, trying system token...`);
        }
      } else {
        logs.push(`[7] No OAuth token found in database`);
      }

      // Fallback to system token
      if (!accessToken) {
        const systemToken = this.configService.get<string>(
          'INSTAGRAM_SYSTEM_USER_TOKEN',
        );
        if (systemToken) {
          accessToken = systemToken;
          logs.push(
            `[11] Using system user token (length: ${systemToken.length})`,
          );
          logs.push(
            `[12] System token preview: ${systemToken.substring(0, 20)}...`,
          );
        } else {
          logs.push(`[11] No system user token configured`);
          throw new Error('No valid access token available');
        }
      }

      // Test token validity with a simple API call
      logs.push(`[13] Testing token validity...`);
      try {
        const testUrl = `https://graph.instagram.com/v24.0/me?access_token=${accessToken}`;
        const testResponse = await fetch(testUrl);
        const testData = await testResponse.json();

        if (testData.error) {
          logs.push(
            `[14] ❌ Token test FAILED: ${JSON.stringify(testData.error)}`,
          );
        } else {
          logs.push(`[14] ✅ Token test SUCCESS: ${JSON.stringify(testData)}`);
        }
      } catch (error) {
        logs.push(
          `[14] ❌ Token test ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Log metadata
      const metadata = (account as any).metadata;
      if (metadata) {
        logs.push(`[15] Account metadata: ${JSON.stringify(metadata)}`);
      }

      // Test actual Instagram Graph API publishing capability
      logs.push(`[16] Testing Instagram Graph API publishing capability...`);
      try {
        // Try to create a container (test without actual publish)
        const mediaUrl = post.mediaUrls[0];
        logs.push(`[17] Media URL: ${mediaUrl}`);

        // First, check if we have a Facebook page connected
        const fbPagesUrl = `https://graph.facebook.com/v24.0/me/accounts?access_token=${accessToken}`;
        const fbPagesResponse = await fetch(fbPagesUrl);
        const fbPagesData = await fbPagesResponse.json();

        if (fbPagesData.error) {
          logs.push(
            `[18] ❌ Facebook Pages check FAILED: ${JSON.stringify(fbPagesData.error)}`,
          );
        } else {
          logs.push(
            `[18] ✅ Facebook Pages found: ${JSON.stringify(fbPagesData.data?.length || 0)} pages`,
          );

          if (fbPagesData.data && fbPagesData.data.length > 0) {
            for (const page of fbPagesData.data) {
              logs.push(`[19] - Page: ${page.name} (ID: ${page.id})`);

              // Check if page has Instagram Business Account
              if (page.instagram_business_account) {
                logs.push(
                  `[20] ✅ Instagram Business Account ID: ${page.instagram_business_account.id}`,
                );
              } else {
                logs.push(
                  `[20] ⚠️ Page "${page.name}" has NO Instagram Business Account linked`,
                );
              }
            }
          } else {
            logs.push(
              `[19] ⚠️ No Facebook pages found. You need to link your Instagram to a Facebook Page`,
            );
          }
        }

        // Try to get Instagram Business Account directly
        const igAccountUrl = `https://graph.instagram.com/v24.0/${account.platformAccountId}?fields=id,username,account_type,ig_id&access_token=${accessToken}`;
        const igAccountResponse = await fetch(igAccountUrl);
        const igAccountData = await igAccountResponse.json();

        if (igAccountData.error) {
          logs.push(
            `[21] ❌ Instagram Account details FAILED: ${JSON.stringify(igAccountData.error)}`,
          );
        } else {
          logs.push(
            `[21] ✅ Instagram Account details: ${JSON.stringify(igAccountData)}`,
          );
        }
      } catch (error) {
        logs.push(
          `[16] ❌ Publishing test ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      return {
        success: true,
        postId,
        accountId: account.id,
        username: account.username,
        platformAccountId: account.platformAccountId,
        accountType: account.accountType,
        hasOAuthToken: !!token,
        usingSystemToken: !token || token.isExpired,
        tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : null,
        logs,
      };
    } catch (error) {
      logs.push(
        `[ERROR] ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs,
      };
    }
  }
}
