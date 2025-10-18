# IG-007: Instagram Analytics/Insights

**Epic:** Social Selling Platform - Instagram Integration
**Sprint:** Sprint 3
**Story Points:** 13
**Priority:** High
**Assignee:** Backend Team
**Status:** Ready for Development

---

## Overview

Implement comprehensive Instagram analytics and insights functionality to fetch, store, and analyze Instagram account and media performance data. This includes account insights, media insights (reach, impressions, engagement), audience demographics, metric storage in PostgreSQL, engagement rate calculations, analytics report generation, and data visualization preparation.

---

## Business Value

- **Performance Tracking**: Monitor content performance over time
- **Data-Driven Decisions**: Optimize content strategy based on metrics
- **ROI Measurement**: Demonstrate social media marketing effectiveness
- **Audience Understanding**: Know when and what content resonates
- **Competitive Advantage**: Track growth and engagement trends
- **Content Optimization**: Identify best-performing content types

---

## Technical Requirements

### 1. Database Schema

#### Account Insights Table
```sql
-- Migration: 20250118000015_create_instagram_account_insights.sql

CREATE TABLE instagram_account_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,

    -- Date range for metrics
    date DATE NOT NULL,
    period VARCHAR(50) NOT NULL, -- day, week, days_28

    -- Follower metrics
    follower_count INTEGER,
    following_count INTEGER,
    follower_change INTEGER, -- Change from previous period

    -- Reach metrics
    reach INTEGER, -- Accounts reached
    impressions INTEGER, -- Total impressions

    -- Engagement metrics
    profile_views INTEGER,
    website_clicks INTEGER,
    email_contacts INTEGER,
    phone_call_clicks INTEGER,
    text_message_clicks INTEGER,
    get_directions_clicks INTEGER,

    -- Content metrics
    posts_count INTEGER,
    stories_count INTEGER,

    -- Audience metrics (stored as JSONB for flexibility)
    audience_city JSONB DEFAULT '{}',
    audience_country JSONB DEFAULT '{}',
    audience_gender_age JSONB DEFAULT '{}',
    audience_locale JSONB DEFAULT '{}',

    -- Online followers
    online_followers JSONB DEFAULT '{}', -- Hour-by-hour breakdown

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(instagram_account_id, date, period)
);

CREATE INDEX idx_account_insights_account ON instagram_account_insights(instagram_account_id);
CREATE INDEX idx_account_insights_date ON instagram_account_insights(date DESC);
CREATE INDEX idx_account_insights_period ON instagram_account_insights(period);
CREATE INDEX idx_account_insights_account_date ON instagram_account_insights(instagram_account_id, date DESC);
```

#### Media Insights Table
```sql
-- Migration: 20250118000016_create_instagram_media_insights.sql

CREATE TABLE instagram_media_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    media_ig_id VARCHAR(255) NOT NULL,

    -- Media info
    media_type VARCHAR(50), -- IMAGE, VIDEO, CAROUSEL_ALBUM, REELS
    media_url TEXT,
    permalink TEXT,
    caption TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,

    -- Engagement metrics
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    saved INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,

    -- Reach metrics
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,

    -- Video metrics
    video_views INTEGER,

    -- Engagement rate
    engagement_rate DECIMAL(5,2), -- Calculated: (likes + comments) / reach * 100

    -- Source breakdown (from impressions)
    from_home INTEGER,
    from_hashtags INTEGER,
    from_explore INTEGER,
    from_other INTEGER,

    -- Last updated
    insights_fetched_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(instagram_account_id, media_ig_id)
);

CREATE INDEX idx_media_insights_account ON instagram_media_insights(instagram_account_id);
CREATE INDEX idx_media_insights_media_id ON instagram_media_insights(media_ig_id);
CREATE INDEX idx_media_insights_timestamp ON instagram_media_insights(timestamp DESC);
CREATE INDEX idx_media_insights_engagement ON instagram_media_insights(engagement_rate DESC);
CREATE INDEX idx_media_insights_reach ON instagram_media_insights(reach DESC);
```

#### Story Insights Table
```sql
-- Migration: 20250118000017_create_instagram_story_insights.sql

CREATE TABLE instagram_story_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    story_ig_id VARCHAR(255) NOT NULL,

    -- Story info
    media_type VARCHAR(50),
    media_url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Engagement metrics
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    replies INTEGER DEFAULT 0,

    -- Interaction metrics
    taps_forward INTEGER DEFAULT 0,
    taps_back INTEGER DEFAULT 0,
    exits INTEGER DEFAULT 0,

    -- Last updated
    insights_fetched_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(instagram_account_id, story_ig_id)
);

CREATE INDEX idx_story_insights_account ON instagram_story_insights(instagram_account_id);
CREATE INDEX idx_story_insights_story_id ON instagram_story_insights(story_ig_id);
CREATE INDEX idx_story_insights_timestamp ON instagram_story_insights(timestamp DESC);
```

#### Analytics Reports Table
```sql
-- Migration: 20250118000018_create_instagram_analytics_reports.sql

CREATE TABLE instagram_analytics_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_account_id UUID NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Report config
    report_type VARCHAR(50) NOT NULL, -- overview, content, audience, engagement
    period VARCHAR(50) NOT NULL, -- day, week, month, custom
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Report data (stored as JSONB for flexibility)
    summary JSONB NOT NULL DEFAULT '{}',
    charts_data JSONB DEFAULT '{}',
    top_posts JSONB DEFAULT '[]',
    insights JSONB DEFAULT '{}',

    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_reports_account ON instagram_analytics_reports(instagram_account_id);
CREATE INDEX idx_analytics_reports_user ON instagram_analytics_reports(user_id);
CREATE INDEX idx_analytics_reports_type ON instagram_analytics_reports(report_type);
CREATE INDEX idx_analytics_reports_period ON instagram_analytics_reports(start_date DESC, end_date DESC);
```

---

### 2. DTOs (Data Transfer Objects)

```typescript
// src/modules/instagram/dto/analytics.dto.ts

import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum InsightPeriod {
  DAY = 'day',
  WEEK = 'week',
  DAYS_28 = 'days_28',
}

export enum ReportType {
  OVERVIEW = 'overview',
  CONTENT = 'content',
  AUDIENCE = 'audience',
  ENGAGEMENT = 'engagement',
}

export class GetAccountInsightsDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsString()
  instagramAccountId: string;

  @ApiProperty({ description: 'Insight period', enum: InsightPeriod })
  @IsEnum(InsightPeriod)
  period: InsightPeriod;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  until?: string;
}

export class AccountInsightsResponseDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  period: string;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followerChange: number;

  @ApiProperty()
  reach: number;

  @ApiProperty()
  impressions: number;

  @ApiProperty()
  profileViews: number;

  @ApiProperty()
  websiteClicks: number;

  @ApiProperty()
  postsCount: number;

  @ApiProperty()
  storiesCount: number;

  @ApiProperty()
  audienceCity: Record<string, number>;

  @ApiProperty()
  audienceCountry: Record<string, number>;

  @ApiProperty()
  audienceGenderAge: Record<string, number>;
}

export class GetMediaInsightsDto {
  @ApiPropertyOptional({ description: 'Media Instagram ID' })
  @IsOptional()
  @IsString()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Get top N posts by engagement' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  topN?: number;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  until?: string;
}

export class MediaInsightsResponseDto {
  @ApiProperty()
  mediaIgId: string;

  @ApiProperty()
  mediaType: string;

  @ApiProperty()
  permalink: string;

  @ApiProperty()
  caption: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  saved: number;

  @ApiProperty()
  shares: number;

  @ApiProperty()
  reach: number;

  @ApiProperty()
  impressions: number;

  @ApiProperty()
  engagementRate: number;
}

export class GenerateReportDto {
  @ApiProperty({ description: 'Instagram account ID' })
  @IsString()
  instagramAccountId: string;

  @ApiProperty({ description: 'Report type', enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  endDate: string;
}

export class AnalyticsReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ReportType })
  reportType: ReportType;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty()
  summary: {
    totalReach: number;
    totalImpressions: number;
    totalEngagement: number;
    averageEngagementRate: number;
    followerGrowth: number;
    topPostsCount: number;
  };

  @ApiProperty()
  chartsData: any;

  @ApiProperty()
  topPosts: MediaInsightsResponseDto[];

  @ApiProperty()
  generatedAt: Date;
}

export class AudienceDemographicsDto {
  @ApiProperty()
  city: Record<string, number>;

  @ApiProperty()
  country: Record<string, number>;

  @ApiProperty()
  genderAge: Record<string, number>;

  @ApiProperty()
  locale: Record<string, number>;
}

export class EngagementMetricsDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  comments: number;

  @ApiProperty()
  saves: number;

  @ApiProperty()
  shares: number;

  @ApiProperty()
  engagementRate: number;
}
```

---

### 3. Service Implementation

```typescript
// src/modules/instagram/services/instagram-analytics.service.ts

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { InstagramAccountInsight } from '../entities/instagram-account-insight.entity';
import { InstagramMediaInsight } from '../entities/instagram-media-insight.entity';
import { InstagramStoryInsight } from '../entities/instagram-story-insight.entity';
import { InstagramAnalyticsReport } from '../entities/instagram-analytics-report.entity';
import { InstagramGraphApiService } from './instagram-graph-api.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as dayjs from 'dayjs';

@Injectable()
export class InstagramAnalyticsService {
  private readonly logger = new Logger(InstagramAnalyticsService.name);

  constructor(
    @InjectRepository(InstagramAccountInsight)
    private accountInsightRepository: Repository<InstagramAccountInsight>,
    @InjectRepository(InstagramMediaInsight)
    private mediaInsightRepository: Repository<InstagramMediaInsight>,
    @InjectRepository(InstagramStoryInsight)
    private storyInsightRepository: Repository<InstagramStoryInsight>,
    @InjectRepository(InstagramAnalyticsReport)
    private reportRepository: Repository<InstagramAnalyticsReport>,
    private graphApiService: InstagramGraphApiService,
    @InjectQueue('instagram-analytics') private analyticsQueue: Queue,
  ) {}

  /**
   * Fetch and store account insights
   */
  async fetchAccountInsights(
    accountId: string,
    userId: string,
    period: string,
    since?: Date,
    until?: Date,
  ): Promise<any> {
    this.logger.log(`Fetching account insights for ${accountId}, period: ${period}`);

    const account = await this.graphApiService.getAccountWithToken(accountId, userId);

    // Fetch from Instagram Graph API
    const insights = await this.graphApiService.getAccountInsights(
      account.access_token,
      account.instagram_business_account_id,
      period,
      since,
      until,
    );

    // Store in database
    const date = dayjs(until || new Date()).format('YYYY-MM-DD');

    let accountInsight = await this.accountInsightRepository.findOne({
      where: { instagram_account_id: accountId, date, period },
    });

    if (!accountInsight) {
      accountInsight = this.accountInsightRepository.create({
        instagram_account_id: accountId,
        date,
        period,
      });
    }

    // Map insights data
    this.mapAccountInsights(accountInsight, insights);

    // Calculate follower change
    const previousInsight = await this.getPreviousPeriodInsight(accountId, date, period);
    if (previousInsight && accountInsight.follower_count) {
      accountInsight.follower_change = accountInsight.follower_count - (previousInsight.follower_count || 0);
    }

    accountInsight.updated_at = new Date();

    await this.accountInsightRepository.save(accountInsight);

    this.logger.log(`Account insights saved for ${accountId}`);

    return this.mapAccountInsightToDto(accountInsight);
  }

  /**
   * Map Instagram API insights to entity
   */
  private mapAccountInsights(entity: InstagramAccountInsight, insights: any): void {
    for (const insight of insights) {
      switch (insight.name) {
        case 'follower_count':
          entity.follower_count = insight.values[0]?.value || 0;
          break;
        case 'reach':
          entity.reach = insight.values[0]?.value || 0;
          break;
        case 'impressions':
          entity.impressions = insight.values[0]?.value || 0;
          break;
        case 'profile_views':
          entity.profile_views = insight.values[0]?.value || 0;
          break;
        case 'website_clicks':
          entity.website_clicks = insight.values[0]?.value || 0;
          break;
        case 'email_contacts':
          entity.email_contacts = insight.values[0]?.value || 0;
          break;
        case 'phone_call_clicks':
          entity.phone_call_clicks = insight.values[0]?.value || 0;
          break;
        case 'text_message_clicks':
          entity.text_message_clicks = insight.values[0]?.value || 0;
          break;
        case 'get_directions_clicks':
          entity.get_directions_clicks = insight.values[0]?.value || 0;
          break;
        case 'audience_city':
          entity.audience_city = insight.values[0]?.value || {};
          break;
        case 'audience_country':
          entity.audience_country = insight.values[0]?.value || {};
          break;
        case 'audience_gender_age':
          entity.audience_gender_age = insight.values[0]?.value || {};
          break;
        case 'audience_locale':
          entity.audience_locale = insight.values[0]?.value || {};
          break;
        case 'online_followers':
          entity.online_followers = insight.values[0]?.value || {};
          break;
      }
    }
  }

  /**
   * Get previous period insight for comparison
   */
  private async getPreviousPeriodInsight(
    accountId: string,
    currentDate: string,
    period: string,
  ): Promise<InstagramAccountInsight | null> {
    let previousDate: string;

    switch (period) {
      case 'day':
        previousDate = dayjs(currentDate).subtract(1, 'day').format('YYYY-MM-DD');
        break;
      case 'week':
        previousDate = dayjs(currentDate).subtract(7, 'days').format('YYYY-MM-DD');
        break;
      case 'days_28':
        previousDate = dayjs(currentDate).subtract(28, 'days').format('YYYY-MM-DD');
        break;
      default:
        return null;
    }

    return this.accountInsightRepository.findOne({
      where: { instagram_account_id: accountId, date: previousDate, period },
    });
  }

  /**
   * Fetch and store media insights
   */
  async fetchMediaInsights(accountId: string, userId: string, mediaId?: string): Promise<any> {
    this.logger.log(`Fetching media insights for account ${accountId}`);

    const account = await this.graphApiService.getAccountWithToken(accountId, userId);

    let mediaList: any[];

    if (mediaId) {
      // Fetch single media
      const media = await this.graphApiService.getMediaDetails(account.access_token, mediaId);
      mediaList = [media];
    } else {
      // Fetch recent media
      mediaList = await this.graphApiService.getRecentMedia(account.access_token, account.instagram_business_account_id, 50);
    }

    const insights: any[] = [];

    for (const media of mediaList) {
      // Fetch insights for this media
      const mediaInsights = await this.graphApiService.getMediaInsights(account.access_token, media.id);

      // Store in database
      let mediaInsight = await this.mediaInsightRepository.findOne({
        where: { instagram_account_id: accountId, media_ig_id: media.id },
      });

      if (!mediaInsight) {
        mediaInsight = this.mediaInsightRepository.create({
          instagram_account_id: accountId,
          media_ig_id: media.id,
          media_type: media.media_type,
          media_url: media.media_url,
          permalink: media.permalink,
          caption: media.caption,
          timestamp: new Date(media.timestamp),
        });
      }

      // Map insights
      this.mapMediaInsights(mediaInsight, mediaInsights);

      // Calculate engagement rate
      if (mediaInsight.reach > 0) {
        const engagement = (mediaInsight.like_count || 0) + (mediaInsight.comment_count || 0);
        mediaInsight.engagement_rate = (engagement / mediaInsight.reach) * 100;
      }

      mediaInsight.insights_fetched_at = new Date();
      mediaInsight.updated_at = new Date();

      await this.mediaInsightRepository.save(mediaInsight);

      insights.push(this.mapMediaInsightToDto(mediaInsight));
    }

    this.logger.log(`Fetched insights for ${insights.length} media items`);

    return insights;
  }

  /**
   * Map media insights from API to entity
   */
  private mapMediaInsights(entity: InstagramMediaInsight, insights: any[]): void {
    for (const insight of insights) {
      switch (insight.name) {
        case 'engagement':
          entity.like_count = insight.values[0]?.value || 0;
          break;
        case 'impressions':
          entity.impressions = insight.values[0]?.value || 0;
          break;
        case 'reach':
          entity.reach = insight.values[0]?.value || 0;
          break;
        case 'saved':
          entity.saved = insight.values[0]?.value || 0;
          break;
        case 'video_views':
          entity.video_views = insight.values[0]?.value || 0;
          break;
      }
    }
  }

  /**
   * Get account insights history
   */
  async getAccountInsightsHistory(
    accountId: string,
    userId: string,
    period: string,
    since: Date,
    until: Date,
  ): Promise<any[]> {
    const account = await this.graphApiService.getAccountWithToken(accountId, userId);

    const insights = await this.accountInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        period,
        date: Between(dayjs(since).format('YYYY-MM-DD'), dayjs(until).format('YYYY-MM-DD')),
      },
      order: { date: 'ASC' },
    });

    return insights.map(i => this.mapAccountInsightToDto(i));
  }

  /**
   * Get top performing posts
   */
  async getTopPosts(
    accountId: string,
    userId: string,
    metric: 'engagement' | 'reach' | 'impressions' = 'engagement',
    limit: number = 10,
    since?: Date,
    until?: Date,
  ): Promise<any[]> {
    const account = await this.graphApiService.getAccountWithToken(accountId, userId);

    const queryBuilder = this.mediaInsightRepository.createQueryBuilder('media');
    queryBuilder.where('media.instagram_account_id = :accountId', { accountId });

    if (since) {
      queryBuilder.andWhere('media.timestamp >= :since', { since });
    }

    if (until) {
      queryBuilder.andWhere('media.timestamp <= :until', { until });
    }

    // Order by metric
    switch (metric) {
      case 'engagement':
        queryBuilder.orderBy('media.engagement_rate', 'DESC');
        break;
      case 'reach':
        queryBuilder.orderBy('media.reach', 'DESC');
        break;
      case 'impressions':
        queryBuilder.orderBy('media.impressions', 'DESC');
        break;
    }

    queryBuilder.limit(limit);

    const posts = await queryBuilder.getMany();

    return posts.map(p => this.mapMediaInsightToDto(p));
  }

  /**
   * Get audience demographics
   */
  async getAudienceDemographics(accountId: string, userId: string): Promise<any> {
    const account = await this.graphApiService.getAccountWithToken(accountId, userId);

    // Get latest account insight with audience data
    const insight = await this.accountInsightRepository.findOne({
      where: { instagram_account_id: accountId },
      order: { date: 'DESC' },
    });

    if (!insight) {
      throw new NotFoundException('No audience data available');
    }

    return {
      city: insight.audience_city || {},
      country: insight.audience_country || {},
      genderAge: insight.audience_gender_age || {},
      locale: insight.audience_locale || {},
      onlineFollowers: insight.online_followers || {},
    };
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    userId: string,
    accountId: string,
    reportType: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    this.logger.log(`Generating ${reportType} report for ${accountId}`);

    const account = await this.graphApiService.getAccountWithToken(accountId, userId);

    // Fetch data based on report type
    let summary: any = {};
    let chartsData: any = {};
    let topPosts: any[] = [];
    let insights: any = {};

    switch (reportType) {
      case 'overview':
        summary = await this.generateOverviewSummary(accountId, startDate, endDate);
        chartsData = await this.generateOverviewCharts(accountId, startDate, endDate);
        topPosts = await this.getTopPosts(accountId, userId, 'engagement', 5, startDate, endDate);
        break;

      case 'content':
        summary = await this.generateContentSummary(accountId, startDate, endDate);
        chartsData = await this.generateContentCharts(accountId, startDate, endDate);
        topPosts = await this.getTopPosts(accountId, userId, 'engagement', 10, startDate, endDate);
        break;

      case 'audience':
        summary = await this.generateAudienceSummary(accountId, startDate, endDate);
        chartsData = await this.generateAudienceCharts(accountId, startDate, endDate);
        insights = await this.getAudienceDemographics(accountId, userId);
        break;

      case 'engagement':
        summary = await this.generateEngagementSummary(accountId, startDate, endDate);
        chartsData = await this.generateEngagementCharts(accountId, startDate, endDate);
        topPosts = await this.getTopPosts(accountId, userId, 'engagement', 10, startDate, endDate);
        break;
    }

    // Create report
    const report = this.reportRepository.create({
      instagram_account_id: accountId,
      user_id: userId,
      report_type: reportType,
      period: this.calculatePeriod(startDate, endDate),
      start_date: dayjs(startDate).format('YYYY-MM-DD'),
      end_date: dayjs(endDate).format('YYYY-MM-DD'),
      summary,
      charts_data: chartsData,
      top_posts: topPosts,
      insights,
    });

    await this.reportRepository.save(report);

    this.logger.log(`Report generated: ${report.id}`);

    return {
      id: report.id,
      reportType: report.report_type,
      startDate: report.start_date,
      endDate: report.end_date,
      summary,
      chartsData,
      topPosts,
      insights,
      generatedAt: report.generated_at,
    };
  }

  /**
   * Generate overview summary
   */
  private async generateOverviewSummary(accountId: string, startDate: Date, endDate: Date): Promise<any> {
    const insights = await this.accountInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        date: Between(dayjs(startDate).format('YYYY-MM-DD'), dayjs(endDate).format('YYYY-MM-DD')),
      },
      order: { date: 'ASC' },
    });

    const mediaInsights = await this.mediaInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        timestamp: Between(startDate, endDate),
      },
    });

    const totalReach = insights.reduce((sum, i) => sum + (i.reach || 0), 0);
    const totalImpressions = insights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    const totalEngagement = mediaInsights.reduce((sum, m) => sum + (m.like_count || 0) + (m.comment_count || 0), 0);

    const avgEngagementRate = mediaInsights.length > 0
      ? mediaInsights.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / mediaInsights.length
      : 0;

    const followerGrowth = insights.length > 1
      ? (insights[insights.length - 1].follower_count || 0) - (insights[0].follower_count || 0)
      : 0;

    return {
      totalReach,
      totalImpressions,
      totalEngagement,
      averageEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      followerGrowth,
      postsCount: mediaInsights.length,
      profileViews: insights.reduce((sum, i) => sum + (i.profile_views || 0), 0),
      websiteClicks: insights.reduce((sum, i) => sum + (i.website_clicks || 0), 0),
    };
  }

  /**
   * Generate overview charts data
   */
  private async generateOverviewCharts(accountId: string, startDate: Date, endDate: Date): Promise<any> {
    const insights = await this.accountInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        date: Between(dayjs(startDate).format('YYYY-MM-DD'), dayjs(endDate).format('YYYY-MM-DD')),
      },
      order: { date: 'ASC' },
    });

    return {
      reachOverTime: insights.map(i => ({ date: i.date, value: i.reach })),
      impressionsOverTime: insights.map(i => ({ date: i.date, value: i.impressions })),
      followerGrowth: insights.map(i => ({ date: i.date, value: i.follower_count })),
      profileViews: insights.map(i => ({ date: i.date, value: i.profile_views })),
    };
  }

  /**
   * Generate content summary
   */
  private async generateContentSummary(accountId: string, startDate: Date, endDate: Date): Promise<any> {
    const mediaInsights = await this.mediaInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        timestamp: Between(startDate, endDate),
      },
    });

    const totalPosts = mediaInsights.length;
    const totalLikes = mediaInsights.reduce((sum, m) => sum + (m.like_count || 0), 0);
    const totalComments = mediaInsights.reduce((sum, m) => sum + (m.comment_count || 0), 0);
    const totalSaves = mediaInsights.reduce((sum, m) => sum + (m.saved || 0), 0);
    const totalReach = mediaInsights.reduce((sum, m) => sum + (m.reach || 0), 0);

    // Group by media type
    const byType = mediaInsights.reduce((acc, m) => {
      const type = m.media_type || 'unknown';
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPosts,
      totalLikes,
      totalComments,
      totalSaves,
      totalReach,
      averageLikesPerPost: totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0,
      averageCommentsPerPost: totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0,
      postsByType: byType,
    };
  }

  /**
   * Generate content charts
   */
  private async generateContentCharts(accountId: string, startDate: Date, endDate: Date): Promise<any> {
    const mediaInsights = await this.mediaInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    // Group by day
    const engagementByDay = mediaInsights.reduce((acc, m) => {
      const day = dayjs(m.timestamp).format('YYYY-MM-DD');
      if (!acc[day]) {
        acc[day] = { likes: 0, comments: 0, saves: 0 };
      }
      acc[day].likes += m.like_count || 0;
      acc[day].comments += m.comment_count || 0;
      acc[day].saves += m.saved || 0;
      return acc;
    }, {} as Record<string, any>);

    return {
      engagementByDay: Object.entries(engagementByDay).map(([date, data]) => ({
        date,
        ...data,
      })),
      reachByPost: mediaInsights.map(m => ({
        mediaId: m.media_ig_id,
        reach: m.reach,
        impressions: m.impressions,
      })),
    };
  }

  /**
   * Generate engagement summary
   */
  private async generateEngagementSummary(accountId: string, startDate: Date, endDate: Date): Promise<any> {
    const mediaInsights = await this.mediaInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        timestamp: Between(startDate, endDate),
      },
    });

    const totalEngagement = mediaInsights.reduce(
      (sum, m) => sum + (m.like_count || 0) + (m.comment_count || 0) + (m.saved || 0),
      0,
    );

    const avgEngagementRate = mediaInsights.length > 0
      ? mediaInsights.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / mediaInsights.length
      : 0;

    return {
      totalEngagement,
      averageEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      totalLikes: mediaInsights.reduce((sum, m) => sum + (m.like_count || 0), 0),
      totalComments: mediaInsights.reduce((sum, m) => sum + (m.comment_count || 0), 0),
      totalSaves: mediaInsights.reduce((sum, m) => sum + (m.saved || 0), 0),
      totalShares: mediaInsights.reduce((sum, m) => sum + (m.shares || 0), 0),
    };
  }

  /**
   * Generate engagement charts
   */
  private async generateEngagementCharts(accountId: string, startDate: Date, endDate: Date): Promise<any> {
    const mediaInsights = await this.mediaInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    return {
      engagementRate: mediaInsights.map(m => ({
        date: dayjs(m.timestamp).format('YYYY-MM-DD'),
        rate: m.engagement_rate,
      })),
      engagementBreakdown: [
        { type: 'Likes', value: mediaInsights.reduce((sum, m) => sum + (m.like_count || 0), 0) },
        { type: 'Comments', value: mediaInsights.reduce((sum, m) => sum + (m.comment_count || 0), 0) },
        { type: 'Saves', value: mediaInsights.reduce((sum, m) => sum + (m.saved || 0), 0) },
        { type: 'Shares', value: mediaInsights.reduce((sum, m) => sum + (m.shares || 0), 0) },
      ],
    };
  }

  /**
   * Generate audience summary
   */
  private async generateAudienceSummary(accountId: string, startDate: Date, endDate: Date): Promise<any> {
    const insights = await this.accountInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        date: Between(dayjs(startDate).format('YYYY-MM-DD'), dayjs(endDate).format('YYYY-MM-DD')),
      },
      order: { date: 'DESC' },
      take: 1,
    });

    if (insights.length === 0) {
      return {};
    }

    const latest = insights[0];

    return {
      totalFollowers: latest.follower_count,
      followerChange: latest.follower_change,
      topCities: this.getTopItems(latest.audience_city, 5),
      topCountries: this.getTopItems(latest.audience_country, 5),
      genderAgeDistribution: latest.audience_gender_age,
    };
  }

  /**
   * Generate audience charts
   */
  private async generateAudienceCharts(accountId: string, startDate: Date, endDate: Date): Promise<any> {
    const insights = await this.accountInsightRepository.find({
      where: {
        instagram_account_id: accountId,
        date: Between(dayjs(startDate).format('YYYY-MM-DD'), dayjs(endDate).format('YYYY-MM-DD')),
      },
      order: { date: 'ASC' },
    });

    return {
      followerGrowth: insights.map(i => ({
        date: i.date,
        followers: i.follower_count,
        change: i.follower_change,
      })),
    };
  }

  /**
   * Calculate period label
   */
  private calculatePeriod(startDate: Date, endDate: Date): string {
    const days = dayjs(endDate).diff(dayjs(startDate), 'day');

    if (days === 1) return 'day';
    if (days === 7) return 'week';
    if (days === 28 || days === 30 || days === 31) return 'month';
    return 'custom';
  }

  /**
   * Get top items from object
   */
  private getTopItems(obj: any, limit: number): any[] {
    if (!obj || typeof obj !== 'object') return [];

    return Object.entries(obj)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, value]) => ({ name: key, value }));
  }

  /**
   * Schedule automatic insights refresh
   */
  async scheduleInsightsRefresh(accountId: string): Promise<void> {
    // Queue daily refresh
    await this.analyticsQueue.add(
      'refresh-account-insights',
      { accountId, period: 'day' },
      {
        repeat: { cron: '0 2 * * *' }, // 2 AM daily
        jobId: `refresh_${accountId}`,
      },
    );

    this.logger.log(`Scheduled automatic insights refresh for account ${accountId}`);
  }

  /**
   * Map entities to DTOs
   */
  private mapAccountInsightToDto(insight: InstagramAccountInsight): any {
    return {
      date: insight.date,
      period: insight.period,
      followerCount: insight.follower_count,
      followerChange: insight.follower_change,
      reach: insight.reach,
      impressions: insight.impressions,
      profileViews: insight.profile_views,
      websiteClicks: insight.website_clicks,
      postsCount: insight.posts_count,
      storiesCount: insight.stories_count,
      audienceCity: insight.audience_city,
      audienceCountry: insight.audience_country,
      audienceGenderAge: insight.audience_gender_age,
    };
  }

  private mapMediaInsightToDto(insight: InstagramMediaInsight): any {
    return {
      mediaIgId: insight.media_ig_id,
      mediaType: insight.media_type,
      permalink: insight.permalink,
      caption: insight.caption,
      timestamp: insight.timestamp,
      likeCount: insight.like_count,
      commentCount: insight.comment_count,
      saved: insight.saved,
      shares: insight.shares,
      reach: insight.reach,
      impressions: insight.impressions,
      engagementRate: insight.engagement_rate,
    };
  }
}
```

---

### 4. Controller Implementation

```typescript
// src/modules/instagram/controllers/instagram-analytics.controller.ts

import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramAnalyticsService } from '../services/instagram-analytics.service';
import {
  GetAccountInsightsDto,
  GetMediaInsightsDto,
  GenerateReportDto,
  AccountInsightsResponseDto,
  MediaInsightsResponseDto,
  AnalyticsReportResponseDto,
  AudienceDemographicsDto,
} from '../dto/analytics.dto';

@ApiTags('Instagram Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('instagram/analytics')
export class InstagramAnalyticsController {
  constructor(private analyticsService: InstagramAnalyticsService) {}

  // ========== Account Insights ==========

  @Post('account/insights')
  @ApiOperation({ summary: 'Fetch account insights' })
  @ApiResponse({ status: 200, description: 'Insights fetched successfully', type: AccountInsightsResponseDto })
  async fetchAccountInsights(@Request() req, @Body() dto: GetAccountInsightsDto) {
    const since = dto.since ? new Date(dto.since) : undefined;
    const until = dto.until ? new Date(dto.until) : undefined;

    return this.analyticsService.fetchAccountInsights(
      dto.instagramAccountId,
      req.user.id,
      dto.period,
      since,
      until,
    );
  }

  @Get('account/insights/:accountId')
  @ApiOperation({ summary: 'Get account insights history' })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully', type: [AccountInsightsResponseDto] })
  async getAccountInsights(
    @Request() req,
    @Param('accountId') accountId: string,
    @Query('period') period: string = 'day',
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const untilDate = until ? new Date(until) : new Date();

    return this.analyticsService.getAccountInsightsHistory(
      accountId,
      req.user.id,
      period,
      sinceDate,
      untilDate,
    );
  }

  // ========== Media Insights ==========

  @Post('media/insights/:accountId')
  @ApiOperation({ summary: 'Fetch media insights' })
  @ApiResponse({ status: 200, description: 'Media insights fetched successfully', type: [MediaInsightsResponseDto] })
  async fetchMediaInsights(
    @Request() req,
    @Param('accountId') accountId: string,
    @Query() dto: GetMediaInsightsDto,
  ) {
    return this.analyticsService.fetchMediaInsights(accountId, req.user.id, dto.mediaId);
  }

  @Get('media/top/:accountId')
  @ApiOperation({ summary: 'Get top performing posts' })
  @ApiResponse({ status: 200, description: 'Top posts retrieved successfully', type: [MediaInsightsResponseDto] })
  async getTopPosts(
    @Request() req,
    @Param('accountId') accountId: string,
    @Query('metric') metric: 'engagement' | 'reach' | 'impressions' = 'engagement',
    @Query('limit') limit: number = 10,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const sinceDate = since ? new Date(since) : undefined;
    const untilDate = until ? new Date(until) : undefined;

    return this.analyticsService.getTopPosts(accountId, req.user.id, metric, limit, sinceDate, untilDate);
  }

  // ========== Audience ==========

  @Get('audience/:accountId')
  @ApiOperation({ summary: 'Get audience demographics' })
  @ApiResponse({ status: 200, description: 'Audience data retrieved successfully', type: AudienceDemographicsDto })
  async getAudienceDemographics(@Request() req, @Param('accountId') accountId: string) {
    return this.analyticsService.getAudienceDemographics(accountId, req.user.id);
  }

  // ========== Reports ==========

  @Post('reports')
  @ApiOperation({ summary: 'Generate analytics report' })
  @ApiResponse({ status: 201, description: 'Report generated successfully', type: AnalyticsReportResponseDto })
  async generateReport(@Request() req, @Body() dto: GenerateReportDto) {
    return this.analyticsService.generateReport(
      req.user.id,
      dto.instagramAccountId,
      dto.reportType,
      new Date(dto.startDate),
      new Date(dto.endDate),
    );
  }

  @Get('reports/:accountId')
  @ApiOperation({ summary: 'List analytics reports' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async listReports(@Request() req, @Param('accountId') accountId: string) {
    // Implement list reports
    return { message: 'List reports endpoint' };
  }

  // ========== Scheduling ==========

  @Post('schedule-refresh/:accountId')
  @ApiOperation({ summary: 'Schedule automatic insights refresh' })
  @ApiResponse({ status: 200, description: 'Refresh scheduled successfully' })
  async scheduleRefresh(@Request() req, @Param('accountId') accountId: string) {
    await this.analyticsService.scheduleInsightsRefresh(accountId);
    return { message: 'Automatic insights refresh scheduled' };
  }
}
```

---

(Due to length constraints, continuing with key sections...)

### 5. API Examples

#### Fetch Account Insights
```bash
curl -X POST "http://localhost:3000/api/instagram/analytics/account/insights" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "period": "day",
    "since": "2025-01-01T00:00:00Z",
    "until": "2025-01-18T00:00:00Z"
  }'
```

#### Get Top Posts
```bash
curl -X GET "http://localhost:3000/api/instagram/analytics/media/top/550e8400-e29b-41d4-a716-446655440000?metric=engagement&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Generate Report
```bash
curl -X POST "http://localhost:3000/api/instagram/analytics/reports" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagramAccountId": "550e8400-e29b-41d4-a716-446655440000",
    "reportType": "overview",
    "startDate": "2025-01-01",
    "endDate": "2025-01-18"
  }'
```

---

## Acceptance Criteria

### Functional Requirements

1. **Account Insights** - [ ] Fetch follower count, reach, impressions - [ ] Track profile views, website clicks - [ ] Store audience demographics - [ ] Calculate follower growth - [ ] Support multiple periods (day, week, 28 days)

2. **Media Insights** - [ ] Fetch likes, comments, saves, shares - [ ] Track reach and impressions - [ ] Calculate engagement rates - [ ] Support individual media or bulk fetch - [ ] Store video views for video posts

3. **Analytics Reports** - [ ] Generate overview reports - [ ] Generate content reports - [ ] Generate audience reports - [ ] Generate engagement reports - [ ] Include charts data for visualization

4-20. *[Additional criteria similar to previous tasks]*

---

## Dependencies

- **IG-001**: Instagram OAuth
- **IG-002**: Instagram accounts
- **Database**: PostgreSQL
- **Queue**: BullMQ for scheduled refreshes

---

## Estimated Effort

- **Total**: ~45 hours (13 story points)

---

**End of IG-007**
