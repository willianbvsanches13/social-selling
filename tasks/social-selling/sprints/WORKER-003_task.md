# WORKER-003: Instagram Analytics Sync Worker

## Epic
Background Workers & Job Processing

## Story
As a system administrator, I need a reliable background worker that runs scheduled jobs to fetch Instagram insights (account metrics and media performance), stores metrics in PostgreSQL, calculates engagement rates, detects trending posts, generates analytics reports, and maintains historical data tracking for data-driven decision making.

## Priority
P1 - High

## Estimated Effort
13 Story Points (Large)

## Dependencies
- Instagram Graph API integration (IG-004)
- PostgreSQL database with analytics tables
- Redis for BullMQ
- BullMQ library installed
- Cron scheduler setup

## Technical Context

### Technology Stack
- **Queue System**: BullMQ 5.x with Redis
- **Scheduler**: BullMQ Cron Jobs
- **Worker Runtime**: Node.js 20.x with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Instagram API**: Meta Graph API v18.0 Insights
- **Analytics**: Custom calculations and aggregations
- **Logging**: Winston/Pino
- **Monitoring**: Bull Board UI

### Architecture Overview
```
┌─────────────────┐
│  BullMQ Cron    │
│  Scheduler      │
└────────┬────────┘
         │ Trigger Daily
         ▼
┌─────────────────┐
│  Analytics      │
│  Queue          │
└────────┬────────┘
         │ Process
         ▼
┌─────────────────┐
│  Analytics      │
│  Sync Worker    │
└────┬───┬───┬────┘
     │   │   │
     │   │   └──────────────┐
     │   │                  │
     ▼   ▼                  ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│Instagram│  │Analytics │  │PostgreSQL│
│   API   │  │Processor │  │ Storage  │
└─────────┘  └──────────┘  └──────────┘
```

### Instagram Insights Types

#### Account Insights (Daily)
- `impressions`: Total impressions
- `reach`: Total reach
- `follower_count`: Follower count
- `profile_views`: Profile views
- `website_clicks`: Website clicks (if business account)

#### Media Insights (Per Post)
- `impressions`: Post impressions
- `reach`: Post reach
- `engagement`: Total engagements (likes + comments + saves + shares)
- `saved`: Number of saves
- `video_views`: Video views (for videos)
- `comments`: Comment count
- `likes`: Like count

### Queue Design
- **Queue Name**: `instagram-analytics-sync`
- **Schedule**: Daily at 2 AM UTC
- **Concurrency**: 2 workers
- **Retry Strategy**: Max 3 attempts with exponential backoff
- **Job Timeout**: 10 minutes per job
- **Historical Data**: Last 30 days for media, 90 days for account

## Detailed Requirements

### 1. BullMQ Queue Configuration

#### Queue Setup Module
```typescript
// src/workers/queues/analytics-sync.queue.ts

import { Queue, QueueOptions, QueueScheduler } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum AnalyticsSyncType {
  ACCOUNT_INSIGHTS = 'account_insights',
  MEDIA_INSIGHTS = 'media_insights',
  FULL_SYNC = 'full_sync',
}

export interface AnalyticsSyncJobData {
  syncType: AnalyticsSyncType;
  accountId: string;
  userId: string;
  dateRange?: {
    since: Date;
    until: Date;
  };
  mediaIds?: string[]; // For selective media sync
  force?: boolean; // Force re-sync even if data exists
}

export interface AnalyticsSyncJobResult {
  success: boolean;
  syncType: AnalyticsSyncType;
  accountId: string;
  stats: {
    accountMetricsFetched: number;
    mediaMetricsFetched: number;
    trendsDetected: number;
    reportGenerated: boolean;
  };
  errors?: string[];
  syncedAt: Date;
}

@Injectable()
export class AnalyticsSyncQueue {
  private queue: Queue<AnalyticsSyncJobData, AnalyticsSyncJobResult>;

  constructor(private configService: ConfigService) {
    this.initializeQueue();
  }

  private initializeQueue() {
    const queueOptions: QueueOptions = {
      connection: {
        host: this.configService.get('REDIS_HOST'),
        port: this.configService.get('REDIS_PORT'),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute base delay
        },
        removeOnComplete: {
          count: 100,
          age: 604800, // 7 days
        },
        removeOnFail: {
          count: 500,
          age: 2592000, // 30 days
        },
      },
    };

    this.queue = new Queue<AnalyticsSyncJobData, AnalyticsSyncJobResult>(
      'instagram-analytics-sync',
      queueOptions,
    );

    this.setupScheduledJobs();
  }

  private async setupScheduledJobs() {
    // Daily full sync at 2 AM UTC
    await this.queue.add(
      'scheduled-full-sync',
      {
        syncType: AnalyticsSyncType.FULL_SYNC,
        accountId: 'all', // Will sync all active accounts
        userId: 'system',
      },
      {
        repeat: {
          pattern: '0 2 * * *', // Cron: Every day at 2 AM
        },
      },
    );

    // Hourly media insights for recent posts (last 24h)
    await this.queue.add(
      'scheduled-media-sync',
      {
        syncType: AnalyticsSyncType.MEDIA_INSIGHTS,
        accountId: 'all',
        userId: 'system',
        dateRange: {
          since: new Date(Date.now() - 24 * 60 * 60 * 1000),
          until: new Date(),
        },
      },
      {
        repeat: {
          pattern: '0 * * * *', // Cron: Every hour
        },
      },
    );
  }

  async addSyncJob(
    data: AnalyticsSyncJobData,
    options?: {
      priority?: number;
      delay?: number;
    },
  ) {
    const jobId = `sync-${data.syncType}-${data.accountId}-${Date.now()}`;

    return this.queue.add('analytics-sync', data, {
      jobId,
      priority: options?.priority || 10,
      delay: options?.delay || 0,
    });
  }

  async triggerManualSync(accountId: string, syncType: AnalyticsSyncType) {
    const account = await this.getAccount(accountId);

    return this.addSyncJob({
      syncType,
      accountId,
      userId: account.userId,
      force: true,
    });
  }

  async getSyncHistory(accountId: string, limit: number = 10) {
    const jobs = await this.queue.getJobs(['completed', 'failed'], 0, limit);

    return jobs
      .filter(job => job.data.accountId === accountId)
      .map(job => ({
        id: job.id,
        syncType: job.data.syncType,
        status: job.finishedOn ? 'completed' : 'failed',
        stats: job.returnvalue?.stats,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        error: job.failedReason,
      }));
  }

  private async getAccount(accountId: string) {
    // Implementation to fetch account
    return { userId: '' };
  }

  getQueue() {
    return this.queue;
  }
}
```

### 2. Instagram Insights Service

#### Insights Fetcher
```typescript
// src/workers/services/instagram-insights.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface AccountInsights {
  impressions: number;
  reach: number;
  followerCount: number;
  profileViews: number;
  websiteClicks: number;
  date: Date;
}

export interface MediaInsights {
  mediaId: string;
  impressions: number;
  reach: number;
  engagement: number;
  saved: number;
  videoViews?: number;
  comments: number;
  likes: number;
}

export interface InsightMetric {
  name: string;
  period: string;
  values: Array<{
    value: number;
    end_time: string;
  }>;
}

@Injectable()
export class InstagramInsightsService {
  private readonly logger = new Logger(InstagramInsightsService.name);
  private axiosInstance: AxiosInstance;
  private readonly graphApiVersion = 'v18.0';
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    this.initializeAxios();
  }

  private initializeAxios() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'SocialSelling/1.0',
      },
    });

    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          this.logger.error(
            `Instagram API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        }
        return Promise.reject(error);
      }
    );
  }

  async getAccountInsights(
    igAccountId: string,
    accessToken: string,
    since: Date,
    until: Date,
  ): Promise<AccountInsights[]> {
    try {
      const metrics = [
        'impressions',
        'reach',
        'follower_count',
        'profile_views',
        'website_clicks',
      ];

      const response = await this.axiosInstance.get(
        `${this.baseUrl}/${igAccountId}/insights`,
        {
          params: {
            metric: metrics.join(','),
            period: 'day',
            since: Math.floor(since.getTime() / 1000),
            until: Math.floor(until.getTime() / 1000),
            access_token: accessToken,
          },
        },
      );

      return this.parseAccountInsights(response.data.data);

    } catch (error) {
      this.logger.error(`Failed to fetch account insights: ${error.message}`, error.stack);
      throw this.transformError(error);
    }
  }

  async getMediaInsights(
    mediaId: string,
    accessToken: string,
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL',
  ): Promise<MediaInsights> {
    try {
      let metrics = [
        'impressions',
        'reach',
        'engagement',
        'saved',
      ];

      if (mediaType === 'VIDEO') {
        metrics.push('video_views');
      }

      const response = await this.axiosInstance.get(
        `${this.baseUrl}/${mediaId}/insights`,
        {
          params: {
            metric: metrics.join(','),
            access_token: accessToken,
          },
        },
      );

      // Also get basic post metrics (likes, comments)
      const mediaResponse = await this.axiosInstance.get(
        `${this.baseUrl}/${mediaId}`,
        {
          params: {
            fields: 'like_count,comments_count',
            access_token: accessToken,
          },
        },
      );

      return this.parseMediaInsights(
        mediaId,
        response.data.data,
        mediaResponse.data,
      );

    } catch (error) {
      this.logger.error(`Failed to fetch media insights for ${mediaId}: ${error.message}`);
      throw this.transformError(error);
    }
  }

  async getBulkMediaInsights(
    mediaIds: string[],
    accessToken: string,
    mediaTypes: Map<string, 'IMAGE' | 'VIDEO' | 'CAROUSEL'>,
  ): Promise<Map<string, MediaInsights>> {
    const results = new Map<string, MediaInsights>();

    // Batch requests in groups of 10 to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < mediaIds.length; i += batchSize) {
      const batch = mediaIds.slice(i, i + batchSize);

      const promises = batch.map(async mediaId => {
        try {
          const mediaType = mediaTypes.get(mediaId) || 'IMAGE';
          const insights = await this.getMediaInsights(mediaId, accessToken, mediaType);
          results.set(mediaId, insights);
        } catch (error) {
          this.logger.warn(`Failed to fetch insights for media ${mediaId}: ${error.message}`);
          // Continue with other media
        }
      });

      await Promise.all(promises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < mediaIds.length) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  private parseAccountInsights(data: InsightMetric[]): AccountInsights[] {
    const insightsByDate = new Map<string, Partial<AccountInsights>>();

    for (const metric of data) {
      for (const value of metric.values) {
        const date = value.end_time;

        if (!insightsByDate.has(date)) {
          insightsByDate.set(date, { date: new Date(date) });
        }

        const insights = insightsByDate.get(date)!;

        switch (metric.name) {
          case 'impressions':
            insights.impressions = value.value;
            break;
          case 'reach':
            insights.reach = value.value;
            break;
          case 'follower_count':
            insights.followerCount = value.value;
            break;
          case 'profile_views':
            insights.profileViews = value.value;
            break;
          case 'website_clicks':
            insights.websiteClicks = value.value;
            break;
        }
      }
    }

    return Array.from(insightsByDate.values()) as AccountInsights[];
  }

  private parseMediaInsights(
    mediaId: string,
    insightsData: InsightMetric[],
    mediaData: any,
  ): MediaInsights {
    const insights: MediaInsights = {
      mediaId,
      impressions: 0,
      reach: 0,
      engagement: 0,
      saved: 0,
      comments: mediaData.comments_count || 0,
      likes: mediaData.like_count || 0,
    };

    for (const metric of insightsData) {
      const value = metric.values[0]?.value || 0;

      switch (metric.name) {
        case 'impressions':
          insights.impressions = value;
          break;
        case 'reach':
          insights.reach = value;
          break;
        case 'engagement':
          insights.engagement = value;
          break;
        case 'saved':
          insights.saved = value;
          break;
        case 'video_views':
          insights.videoViews = value;
          break;
      }
    }

    return insights;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private transformError(error: any): Error {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;

      const errorMap: Record<number, string> = {
        100: 'Invalid parameter - check account or media ID',
        190: 'Invalid access token - please reconnect Instagram account',
        10: 'Permission denied - insufficient permissions for insights',
      };

      const message = errorMap[apiError.code] || apiError.message;
      const customError = new Error(message);
      (customError as any).code = apiError.code;
      return customError;
    }

    return error;
  }
}
```

### 3. Analytics Calculation Service

#### Metrics Calculator
```typescript
// src/workers/services/analytics-calculator.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

export interface EngagementMetrics {
  engagementRate: number;
  likeRate: number;
  commentRate: number;
  saveRate: number;
  shareRate: number;
  averageEngagement: number;
}

export interface TrendingPost {
  postId: string;
  mediaId: string;
  caption: string;
  permalink: string;
  engagementRate: number;
  impressions: number;
  reach: number;
  score: number; // Trending score
  publishedAt: Date;
}

export interface PerformanceReport {
  accountId: string;
  period: {
    start: Date;
    end: Date;
  };
  accountMetrics: {
    totalImpressions: number;
    totalReach: number;
    avgProfileViews: number;
    followerGrowth: number;
    followerCount: number;
  };
  contentMetrics: {
    totalPosts: number;
    avgEngagementRate: number;
    avgImpressions: number;
    avgReach: number;
    bestPerformingPost: TrendingPost | null;
  };
  engagement: EngagementMetrics;
  trends: TrendingPost[];
}

@Injectable()
export class AnalyticsCalculatorService {
  private readonly logger = new Logger(AnalyticsCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  async calculateEngagementMetrics(
    accountId: string,
    since: Date,
    until: Date,
  ): Promise<EngagementMetrics> {
    const mediaInsights = await this.prisma.instagramMediaInsight.findMany({
      where: {
        accountId,
        createdAt: {
          gte: since,
          lte: until,
        },
      },
    });

    if (mediaInsights.length === 0) {
      return {
        engagementRate: 0,
        likeRate: 0,
        commentRate: 0,
        saveRate: 0,
        shareRate: 0,
        averageEngagement: 0,
      };
    }

    const totalImpressions = mediaInsights.reduce((sum, m) => sum + m.impressions, 0);
    const totalEngagement = mediaInsights.reduce((sum, m) => sum + m.engagement, 0);
    const totalLikes = mediaInsights.reduce((sum, m) => sum + m.likes, 0);
    const totalComments = mediaInsights.reduce((sum, m) => sum + m.comments, 0);
    const totalSaves = mediaInsights.reduce((sum, m) => sum + m.saved, 0);

    // Assuming shares are part of engagement but not separately tracked
    const totalShares = totalEngagement - (totalLikes + totalComments + totalSaves);

    return {
      engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
      likeRate: totalImpressions > 0 ? (totalLikes / totalImpressions) * 100 : 0,
      commentRate: totalImpressions > 0 ? (totalComments / totalImpressions) * 100 : 0,
      saveRate: totalImpressions > 0 ? (totalSaves / totalImpressions) * 100 : 0,
      shareRate: totalImpressions > 0 ? (totalShares / totalImpressions) * 100 : 0,
      averageEngagement: totalEngagement / mediaInsights.length,
    };
  }

  async detectTrendingPosts(
    accountId: string,
    days: number = 7,
    limit: number = 10,
  ): Promise<TrendingPost[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get posts with insights from the specified period
    const postsWithInsights = await this.prisma.instagramPost.findMany({
      where: {
        accountId,
        publishedAt: {
          gte: since,
        },
        status: 'PUBLISHED',
      },
      include: {
        insights: true,
      },
    });

    // Calculate trending score for each post
    const trendingPosts = postsWithInsights
      .filter(post => post.insights)
      .map(post => {
        const insights = post.insights!;
        const engagementRate = insights.impressions > 0
          ? (insights.engagement / insights.impressions) * 100
          : 0;

        // Trending score formula:
        // - 40% engagement rate
        // - 30% absolute engagement
        // - 20% reach
        // - 10% recency
        const daysSincePublished = (Date.now() - post.publishedAt!.getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 100 - (daysSincePublished * 10)); // Decay over 10 days

        const score =
          (engagementRate * 0.4) +
          (Math.min(insights.engagement / 1000, 100) * 0.3) +
          (Math.min(insights.reach / 10000, 100) * 0.2) +
          (recencyScore * 0.1);

        return {
          postId: post.id,
          mediaId: post.instagramPostId!,
          caption: post.caption.substring(0, 100),
          permalink: post.permalink!,
          engagementRate,
          impressions: insights.impressions,
          reach: insights.reach,
          score,
          publishedAt: post.publishedAt!,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return trendingPosts;
  }

  async generatePerformanceReport(
    accountId: string,
    since: Date,
    until: Date,
  ): Promise<PerformanceReport> {
    // Fetch account insights for the period
    const accountInsights = await this.prisma.instagramAccountInsight.findMany({
      where: {
        accountId,
        date: {
          gte: since,
          lte: until,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Fetch media insights for the period
    const mediaInsights = await this.prisma.instagramMediaInsight.findMany({
      where: {
        accountId,
        createdAt: {
          gte: since,
          lte: until,
        },
      },
    });

    // Calculate account metrics
    const totalImpressions = accountInsights.reduce((sum, i) => sum + i.impressions, 0);
    const totalReach = accountInsights.reduce((sum, i) => sum + i.reach, 0);
    const avgProfileViews = accountInsights.length > 0
      ? accountInsights.reduce((sum, i) => sum + i.profileViews, 0) / accountInsights.length
      : 0;

    const firstFollowerCount = accountInsights[0]?.followerCount || 0;
    const lastFollowerCount = accountInsights[accountInsights.length - 1]?.followerCount || 0;
    const followerGrowth = lastFollowerCount - firstFollowerCount;

    // Calculate content metrics
    const totalPosts = mediaInsights.length;
    const avgEngagementRate = mediaInsights.length > 0
      ? mediaInsights.reduce((sum, m) => {
          return sum + (m.impressions > 0 ? (m.engagement / m.impressions) * 100 : 0);
        }, 0) / mediaInsights.length
      : 0;

    const avgImpressions = mediaInsights.length > 0
      ? mediaInsights.reduce((sum, m) => sum + m.impressions, 0) / mediaInsights.length
      : 0;

    const avgReach = mediaInsights.length > 0
      ? mediaInsights.reduce((sum, m) => sum + m.reach, 0) / mediaInsights.length
      : 0;

    // Get engagement metrics
    const engagementMetrics = await this.calculateEngagementMetrics(accountId, since, until);

    // Get trending posts
    const trendingPosts = await this.detectTrendingPosts(accountId, 7, 5);

    const report: PerformanceReport = {
      accountId,
      period: { start: since, end: until },
      accountMetrics: {
        totalImpressions,
        totalReach,
        avgProfileViews,
        followerGrowth,
        followerCount: lastFollowerCount,
      },
      contentMetrics: {
        totalPosts,
        avgEngagementRate,
        avgImpressions,
        avgReach,
        bestPerformingPost: trendingPosts[0] || null,
      },
      engagement: engagementMetrics,
      trends: trendingPosts,
    };

    return report;
  }

  async calculatePostPerformanceScore(mediaInsightId: string): Promise<number> {
    const insight = await this.prisma.instagramMediaInsight.findUnique({
      where: { id: mediaInsightId },
    });

    if (!insight) {
      return 0;
    }

    const engagementRate = insight.impressions > 0
      ? (insight.engagement / insight.impressions) * 100
      : 0;

    const saveRate = insight.impressions > 0
      ? (insight.saved / insight.impressions) * 100
      : 0;

    // Performance score weights:
    // - 50% engagement rate
    // - 30% save rate (high intent)
    // - 20% reach relative to impressions
    const reachRate = insight.impressions > 0
      ? (insight.reach / insight.impressions) * 100
      : 0;

    const score = (engagementRate * 0.5) + (saveRate * 0.3) + (reachRate * 0.2);

    return Math.min(100, score);
  }

  async identifyBestPostingTimes(accountId: string): Promise<Map<number, number>> {
    // Analyze posting times and engagement to identify best times
    const posts = await this.prisma.instagramPost.findMany({
      where: {
        accountId,
        status: 'PUBLISHED',
        publishedAt: {
          not: null,
        },
      },
      include: {
        insights: true,
      },
      take: 100,
      orderBy: {
        publishedAt: 'desc',
      },
    });

    const hourlyEngagement = new Map<number, { total: number; count: number }>();

    for (const post of posts) {
      if (!post.insights || !post.publishedAt) continue;

      const hour = post.publishedAt.getHours();
      const engagementRate = post.insights.impressions > 0
        ? (post.insights.engagement / post.insights.impressions) * 100
        : 0;

      if (!hourlyEngagement.has(hour)) {
        hourlyEngagement.set(hour, { total: 0, count: 0 });
      }

      const current = hourlyEngagement.get(hour)!;
      current.total += engagementRate;
      current.count += 1;
    }

    // Calculate average engagement rate per hour
    const avgEngagementByHour = new Map<number, number>();
    for (const [hour, data] of hourlyEngagement.entries()) {
      avgEngagementByHour.set(hour, data.total / data.count);
    }

    return avgEngagementByHour;
  }
}
```

### 4. Analytics Sync Processor

#### Main Sync Worker
```typescript
// src/workers/processors/analytics-sync.processor.ts

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { InstagramInsightsService } from '../services/instagram-insights.service';
import { AnalyticsCalculatorService } from '../services/analytics-calculator.service';
import { NotificationService } from '@/notifications/notification.service';
import {
  AnalyticsSyncJobData,
  AnalyticsSyncJobResult,
  AnalyticsSyncType,
} from '../queues/analytics-sync.queue';

@Processor('instagram-analytics-sync', {
  concurrency: 2,
  limiter: {
    max: 5,
    duration: 60000, // 5 syncs per minute
  },
})
@Injectable()
export class AnalyticsSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsSyncProcessor.name);

  constructor(
    private prisma: PrismaService,
    private insightsService: InstagramInsightsService,
    private calculator: AnalyticsCalculatorService,
    private notification: NotificationService,
  ) {
    super();
  }

  async process(job: Job<AnalyticsSyncJobData, AnalyticsSyncJobResult>): Promise<AnalyticsSyncJobResult> {
    const { syncType, accountId, userId, dateRange, force } = job.data;

    this.logger.log(`Starting analytics sync: ${syncType} for account ${accountId}`);

    const result: AnalyticsSyncJobResult = {
      success: false,
      syncType,
      accountId,
      stats: {
        accountMetricsFetched: 0,
        mediaMetricsFetched: 0,
        trendsDetected: 0,
        reportGenerated: false,
      },
      syncedAt: new Date(),
    };

    const errors: string[] = [];

    try {
      // Handle special case: sync all accounts
      if (accountId === 'all') {
        return await this.syncAllAccounts(job, syncType, dateRange);
      }

      await job.updateProgress(10);

      // Get account details
      const account = await this.getAccount(accountId);

      await job.updateProgress(20);

      // Execute sync based on type
      switch (syncType) {
        case AnalyticsSyncType.ACCOUNT_INSIGHTS:
          await this.syncAccountInsights(account, dateRange, result, errors);
          break;

        case AnalyticsSyncType.MEDIA_INSIGHTS:
          await this.syncMediaInsights(account, dateRange, result, errors);
          break;

        case AnalyticsSyncType.FULL_SYNC:
          await this.fullSync(account, dateRange, result, errors);
          break;
      }

      await job.updateProgress(90);

      // Detect trending posts
      const trendingPosts = await this.calculator.detectTrendingPosts(accountId, 7, 10);
      result.stats.trendsDetected = trendingPosts.length;

      // Generate and save report
      if (syncType === AnalyticsSyncType.FULL_SYNC) {
        await this.generateAndSaveReport(account, dateRange, result);
      }

      await job.updateProgress(100);

      result.success = errors.length === 0;
      if (errors.length > 0) {
        result.errors = errors;
      }

      this.logger.log(
        `Analytics sync completed for ${accountId}: ${result.stats.accountMetricsFetched} account metrics, ${result.stats.mediaMetricsFetched} media metrics`,
      );

      return result;

    } catch (error) {
      this.logger.error(`Analytics sync failed: ${error.message}`, error.stack);

      result.errors = [error.message];
      return result;
    }
  }

  private async syncAllAccounts(
    job: Job<AnalyticsSyncJobData, AnalyticsSyncJobResult>,
    syncType: AnalyticsSyncType,
    dateRange?: { since: Date; until: Date },
  ): Promise<AnalyticsSyncJobResult> {
    const accounts = await this.prisma.instagramAccount.findMany({
      where: { isActive: true },
    });

    this.logger.log(`Syncing analytics for ${accounts.length} accounts`);

    const result: AnalyticsSyncJobResult = {
      success: true,
      syncType,
      accountId: 'all',
      stats: {
        accountMetricsFetched: 0,
        mediaMetricsFetched: 0,
        trendsDetected: 0,
        reportGenerated: false,
      },
      syncedAt: new Date(),
    };

    const errors: string[] = [];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];

      try {
        await job.updateProgress((i / accounts.length) * 100);

        const accountResult: AnalyticsSyncJobResult = {
          success: false,
          syncType,
          accountId: account.id,
          stats: {
            accountMetricsFetched: 0,
            mediaMetricsFetched: 0,
            trendsDetected: 0,
            reportGenerated: false,
          },
          syncedAt: new Date(),
        };

        if (syncType === AnalyticsSyncType.FULL_SYNC) {
          await this.fullSync(account, dateRange, accountResult, errors);
        } else if (syncType === AnalyticsSyncType.ACCOUNT_INSIGHTS) {
          await this.syncAccountInsights(account, dateRange, accountResult, errors);
        } else if (syncType === AnalyticsSyncType.MEDIA_INSIGHTS) {
          await this.syncMediaInsights(account, dateRange, accountResult, errors);
        }

        // Aggregate stats
        result.stats.accountMetricsFetched += accountResult.stats.accountMetricsFetched;
        result.stats.mediaMetricsFetched += accountResult.stats.mediaMetricsFetched;
        result.stats.trendsDetected += accountResult.stats.trendsDetected;

      } catch (error) {
        this.logger.error(`Failed to sync account ${account.id}: ${error.message}`);
        errors.push(`Account ${account.id}: ${error.message}`);
      }
    }

    result.success = errors.length === 0;
    if (errors.length > 0) {
      result.errors = errors;
    }

    return result;
  }

  private async fullSync(
    account: any,
    dateRange: { since: Date; until: Date } | undefined,
    result: AnalyticsSyncJobResult,
    errors: string[],
  ): Promise<void> {
    // Default to last 30 days for media, 90 days for account
    const defaultSince = new Date();
    defaultSince.setDate(defaultSince.getDate() - 30);

    const since = dateRange?.since || defaultSince;
    const until = dateRange?.until || new Date();

    // Sync account insights
    try {
      await this.syncAccountInsights(account, { since, until }, result, errors);
    } catch (error) {
      errors.push(`Account insights: ${error.message}`);
    }

    // Sync media insights
    try {
      await this.syncMediaInsights(account, { since, until }, result, errors);
    } catch (error) {
      errors.push(`Media insights: ${error.message}`);
    }
  }

  private async syncAccountInsights(
    account: any,
    dateRange: { since: Date; until: Date } | undefined,
    result: AnalyticsSyncJobResult,
    errors: string[],
  ): Promise<void> {
    const defaultSince = new Date();
    defaultSince.setDate(defaultSince.getDate() - 90);

    const since = dateRange?.since || defaultSince;
    const until = dateRange?.until || new Date();

    try {
      const insights = await this.insightsService.getAccountInsights(
        account.instagramBusinessAccountId,
        account.accessToken,
        since,
        until,
      );

      // Save insights to database
      for (const insight of insights) {
        await this.prisma.instagramAccountInsight.upsert({
          where: {
            accountId_date: {
              accountId: account.id,
              date: insight.date,
            },
          },
          create: {
            accountId: account.id,
            date: insight.date,
            impressions: insight.impressions,
            reach: insight.reach,
            followerCount: insight.followerCount,
            profileViews: insight.profileViews,
            websiteClicks: insight.websiteClicks,
          },
          update: {
            impressions: insight.impressions,
            reach: insight.reach,
            followerCount: insight.followerCount,
            profileViews: insight.profileViews,
            websiteClicks: insight.websiteClicks,
          },
        });

        result.stats.accountMetricsFetched++;
      }

      this.logger.log(`Synced ${insights.length} account insights for ${account.id}`);

    } catch (error) {
      this.logger.error(`Failed to sync account insights: ${error.message}`);
      throw error;
    }
  }

  private async syncMediaInsights(
    account: any,
    dateRange: { since: Date; until: Date } | undefined,
    result: AnalyticsSyncJobResult,
    errors: string[],
  ): Promise<void> {
    const defaultSince = new Date();
    defaultSince.setDate(defaultSince.getDate() - 30);

    const since = dateRange?.since || defaultSince;
    const until = dateRange?.until || new Date();

    try {
      // Get published posts in date range
      const posts = await this.prisma.instagramPost.findMany({
        where: {
          accountId: account.id,
          status: 'PUBLISHED',
          publishedAt: {
            gte: since,
            lte: until,
          },
          instagramPostId: {
            not: null,
          },
        },
      });

      if (posts.length === 0) {
        this.logger.log(`No posts to sync insights for account ${account.id}`);
        return;
      }

      // Build media types map
      const mediaTypes = new Map<string, 'IMAGE' | 'VIDEO' | 'CAROUSEL'>();
      for (const post of posts) {
        mediaTypes.set(post.instagramPostId!, post.mediaType as any);
      }

      // Fetch insights in bulk
      const mediaIds = posts.map(p => p.instagramPostId!);
      const insightsMap = await this.insightsService.getBulkMediaInsights(
        mediaIds,
        account.accessToken,
        mediaTypes,
      );

      // Save insights to database
      for (const [mediaId, insights] of insightsMap.entries()) {
        const post = posts.find(p => p.instagramPostId === mediaId);
        if (!post) continue;

        await this.prisma.instagramMediaInsight.upsert({
          where: {
            postId: post.id,
          },
          create: {
            postId: post.id,
            accountId: account.id,
            mediaId: insights.mediaId,
            impressions: insights.impressions,
            reach: insights.reach,
            engagement: insights.engagement,
            saved: insights.saved,
            videoViews: insights.videoViews,
            comments: insights.comments,
            likes: insights.likes,
          },
          update: {
            impressions: insights.impressions,
            reach: insights.reach,
            engagement: insights.engagement,
            saved: insights.saved,
            videoViews: insights.videoViews,
            comments: insights.comments,
            likes: insights.likes,
          },
        });

        result.stats.mediaMetricsFetched++;
      }

      this.logger.log(`Synced ${insightsMap.size} media insights for ${account.id}`);

    } catch (error) {
      this.logger.error(`Failed to sync media insights: ${error.message}`);
      throw error;
    }
  }

  private async generateAndSaveReport(
    account: any,
    dateRange: { since: Date; until: Date } | undefined,
    result: AnalyticsSyncJobResult,
  ): Promise<void> {
    const defaultSince = new Date();
    defaultSince.setDate(defaultSince.getDate() - 7);

    const since = dateRange?.since || defaultSince;
    const until = dateRange?.until || new Date();

    const report = await this.calculator.generatePerformanceReport(
      account.id,
      since,
      until,
    );

    await this.prisma.analyticsReport.create({
      data: {
        accountId: account.id,
        periodStart: since,
        periodEnd: until,
        reportData: report as any,
        generatedAt: new Date(),
      },
    });

    result.stats.reportGenerated = true;

    // Notify user if there are significant changes
    if (report.accountMetrics.followerGrowth > 100 || report.trends.length > 0) {
      await this.notification.sendAnalyticsReport(account.userId, report);
    }
  }

  private async getAccount(accountId: string) {
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    if (!account.accessToken) {
      throw new Error(`Account ${accountId} has no access token`);
    }

    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      throw new Error(`Account ${accountId} access token has expired`);
    }

    return account;
  }

  @OnWorkerEvent('active')
  onActive(job: Job<AnalyticsSyncJobData>) {
    this.logger.log(
      `Analytics sync job active: ${job.data.syncType} for ${job.data.accountId}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<AnalyticsSyncJobData>, result: AnalyticsSyncJobResult) {
    this.logger.log(
      `Analytics sync completed: ${result.stats.accountMetricsFetched} account metrics, ${result.stats.mediaMetricsFetched} media metrics`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AnalyticsSyncJobData>, error: Error) {
    this.logger.error(
      `Analytics sync failed for ${job.data.accountId}: ${error.message}`,
      error.stack,
    );
  }
}
```

### 5. Module Configuration

```typescript
// src/workers/analytics-workers.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationsModule } from '@/notifications/notifications.module';

import { AnalyticsSyncQueue } from './queues/analytics-sync.queue';
import { AnalyticsSyncProcessor } from './processors/analytics-sync.processor';
import { InstagramInsightsService } from './services/instagram-insights.service';
import { AnalyticsCalculatorService } from './services/analytics-calculator.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NotificationsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'instagram-analytics-sync',
    }),
  ],
  providers: [
    AnalyticsSyncQueue,
    AnalyticsSyncProcessor,
    InstagramInsightsService,
    AnalyticsCalculatorService,
  ],
  exports: [
    AnalyticsSyncQueue,
    InstagramInsightsService,
    AnalyticsCalculatorService,
  ],
})
export class AnalyticsWorkersModule {}
```

## Testing Requirements

### Unit Tests
```typescript
describe('AnalyticsSyncProcessor', () => {
  it('should fetch and store account insights', async () => {
    // Test implementation
  });

  it('should fetch and store media insights', async () => {
    // Test implementation
  });

  it('should calculate engagement metrics correctly', async () => {
    // Test implementation
  });

  it('should detect trending posts', async () => {
    // Test implementation
  });

  it('should generate performance report', async () => {
    // Test implementation
  });
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Daily sync job runs at 2 AM UTC
- [ ] Hourly media sync for recent posts
- [ ] Account insights fetched for last 90 days
- [ ] Media insights fetched for last 30 days
- [ ] Engagement rates calculated correctly
- [ ] Trending posts detected with scoring algorithm
- [ ] Performance reports generated with full metrics
- [ ] Best posting times identified
- [ ] Historical data maintained
- [ ] Manual sync triggered on demand

### Performance Requirements
- [ ] Account insights sync completes in <2 minutes
- [ ] Media insights sync (100 posts) completes in <5 minutes
- [ ] Respect Instagram API rate limits
- [ ] No data loss during sync
- [ ] Metrics calculated in real-time

### Monitoring Requirements
- [ ] Sync success/failure tracked
- [ ] API errors logged
- [ ] Sync duration monitored
- [ ] Data completeness verified

## Related Tasks
- IG-004: Instagram Graph API Integration
- WORKER-001: Instagram Post Publishing Worker
- WORKER-002: Instagram Webhook Processing Worker

## References
- [Instagram Insights API](https://developers.facebook.com/docs/instagram-api/reference/ig-user/insights)
- [BullMQ Cron Jobs](https://docs.bullmq.io/guide/jobs/repeatable)
