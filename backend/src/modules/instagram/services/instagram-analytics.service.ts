import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InstagramApiService } from './instagram-api.service';
import {
  InstagramAccountInsightRepository,
  InstagramMediaInsightRepository,
  InstagramStoryInsightRepository,
  InstagramAnalyticsReportRepository,
} from '../../../infrastructure/database/repositories/instagram-analytics.repository';
import { IClientAccountRepository } from '../../../domain/repositories/client-account.repository.interface';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import {
  GetAccountInsightsDto,
  GetMediaInsightsDto,
  GenerateReportDto,
  InsightPeriod,
  ReportType,
} from '../dto/analytics.dto';

@Injectable()
export class InstagramAnalyticsService {
  private readonly logger = new Logger(InstagramAnalyticsService.name);
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly instagramApiService: InstagramApiService,
    private readonly accountInsightRepository: InstagramAccountInsightRepository,
    private readonly mediaInsightRepository: InstagramMediaInsightRepository,
    private readonly storyInsightRepository: InstagramStoryInsightRepository,
    private readonly reportRepository: InstagramAnalyticsReportRepository,
    @Inject('IClientAccountRepository')
    private readonly clientAccountRepository: IClientAccountRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Fetch and store account insights
   */
  async fetchAccountInsights(
    userId: string,
    clientAccountId: string,
    period: InsightPeriod,
    since?: string,
    until?: string,
  ): Promise<any> {
    this.logger.log(
      `Fetching account insights for ${clientAccountId}, period: ${period}`,
    );

    try {
      const account =
        await this.clientAccountRepository.findById(clientAccountId);
      if (!account) {
        throw new NotFoundException('Account not found');
      }

      if ((account as any).userId !== userId) {
        throw new BadRequestException('Unauthorized access to account');
      }

      // Define metrics to fetch
      const metrics = [
        'follower_count',
        'reach',
        'impressions',
        'profile_views',
        'website_clicks',
        'email_contacts',
        'phone_call_clicks',
        'text_message_clicks',
        'get_directions_clicks',
        'audience_city',
        'audience_country',
        'audience_gender_age',
        'audience_locale',
        'online_followers',
      ];

      // Fetch from Instagram Graph API
      const insights = await this.instagramApiService.getAccountInsights(
        (account as any).instagramBusinessAccountId ||
          (account as any).instagram_business_account_id,
        metrics,
        period as 'day' | 'week' | 'days_28' | 'lifetime',
      );

      // Store in database
      const date = this.formatDate(until || new Date());

      let accountInsight =
        await this.accountInsightRepository.findByClientAccountAndDate(
          clientAccountId,
          date,
          period,
        );

      if (!accountInsight) {
        accountInsight = {
          clientAccountId,
          date,
          period,
        };
      }

      // Map insights data
      const insightsArray = insights.data || [];
      this.mapAccountInsights(accountInsight, insightsArray);

      // Calculate follower change
      const previousInsight =
        await this.accountInsightRepository.getPreviousPeriodInsight(
          clientAccountId,
          date,
          period,
        );

      if (previousInsight && accountInsight.followerCount) {
        accountInsight.followerChange =
          accountInsight.followerCount - (previousInsight.followerCount || 0);
      }

      accountInsight.updatedAt = new Date();

      const saved = await this.accountInsightRepository.save(accountInsight);

      // Cache the result
      await this.redisService.set(
        `account-insights:${clientAccountId}:${date}:${period}`,
        JSON.stringify(saved),
        this.CACHE_TTL,
      );

      this.logger.log(`Account insights saved for ${clientAccountId}`);

      return this.mapAccountInsightToDto(saved);
    } catch (error: any) {
      this.logger.error(
        `Error fetching account insights: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Map Instagram API insights to entity
   */
  private mapAccountInsights(entity: any, insights: any[]): void {
    for (const insight of insights) {
      const value = insight.values?.[0]?.value;

      switch (insight.name) {
        case 'follower_count':
          entity.followerCount = value || 0;
          break;
        case 'reach':
          entity.reach = value || 0;
          break;
        case 'impressions':
          entity.impressions = value || 0;
          break;
        case 'profile_views':
          entity.profileViews = value || 0;
          break;
        case 'website_clicks':
          entity.websiteClicks = value || 0;
          break;
        case 'email_contacts':
          entity.emailContacts = value || 0;
          break;
        case 'phone_call_clicks':
          entity.phoneCallClicks = value || 0;
          break;
        case 'text_message_clicks':
          entity.textMessageClicks = value || 0;
          break;
        case 'get_directions_clicks':
          entity.getDirectionsClicks = value || 0;
          break;
        case 'audience_city':
          entity.audienceCity = value || {};
          break;
        case 'audience_country':
          entity.audienceCountry = value || {};
          break;
        case 'audience_gender_age':
          entity.audienceGenderAge = value || {};
          break;
        case 'audience_locale':
          entity.audienceLocale = value || {};
          break;
        case 'online_followers':
          entity.onlineFollowers = value || {};
          break;
      }
    }
  }

  /**
   * Fetch and store media insights
   */
  async fetchMediaInsights(
    userId: string,
    clientAccountId: string,
    mediaId?: string,
  ): Promise<any[]> {
    this.logger.log(`Fetching media insights for account ${clientAccountId}`);

    try {
      const account =
        await this.clientAccountRepository.findById(clientAccountId);
      if (!account || (account as any).userId !== userId) {
        throw new BadRequestException('Unauthorized access to account');
      }

      let mediaList: any[] = [];

      if (mediaId) {
        // Fetch single media - using getMedia from API
        const media = await this.instagramApiService.getMedia(
          clientAccountId,
          mediaId,
        );
        mediaList = [media];
      } else {
        // Fetch recent media using getMediaList
        const mediaResponse = await this.instagramApiService.getMediaList(
          clientAccountId,
          {
            limit: 50,
          },
        );
        mediaList = mediaResponse.data || [];
      }

      const insights: any[] = [];

      const mediaMetrics = [
        'engagement',
        'impressions',
        'reach',
        'saved',
        'video_views',
      ];

      for (const media of mediaList) {
        // Fetch insights for this media
        const mediaInsights = await this.instagramApiService.getMediaInsights(
          clientAccountId,
          media.id || media.mediaId,
          mediaMetrics,
        );

        // Store in database
        let mediaInsight = await this.mediaInsightRepository.findByMediaId(
          clientAccountId,
          media.id,
        );

        if (!mediaInsight) {
          mediaInsight = {
            clientAccountId,
            mediaIgId: media.id,
            mediaType: media.media_type,
            mediaUrl: media.media_url,
            permalink: media.permalink,
            caption: media.caption,
            timestamp: new Date(media.timestamp),
            likeCount: 0,
            commentCount: 0,
            saved: 0,
            shares: 0,
            reach: 0,
            impressions: 0,
          };
        }

        // Map insights
        const mediaInsightsArray = mediaInsights.data || [];
        this.mapMediaInsights(mediaInsight, mediaInsightsArray);

        // Calculate engagement rate
        if (mediaInsight.reach > 0) {
          const engagement =
            (mediaInsight.likeCount || 0) + (mediaInsight.commentCount || 0);
          mediaInsight.engagementRate = (engagement / mediaInsight.reach) * 100;
        }

        mediaInsight.insightsFetchedAt = new Date();
        mediaInsight.updatedAt = new Date();

        const saved = await this.mediaInsightRepository.save(mediaInsight);
        insights.push(this.mapMediaInsightToDto(saved));
      }

      this.logger.log(`Fetched insights for ${insights.length} media items`);

      return insights;
    } catch (error: any) {
      this.logger.error(
        `Error fetching media insights: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Map media insights from API to entity
   */
  private mapMediaInsights(entity: any, insights: any[]): void {
    for (const insight of insights) {
      const value = insight.values?.[0]?.value;

      switch (insight.name) {
        case 'engagement':
          entity.likeCount = value || 0;
          break;
        case 'impressions':
          entity.impressions = value || 0;
          break;
        case 'reach':
          entity.reach = value || 0;
          break;
        case 'saved':
          entity.saved = value || 0;
          break;
        case 'video_views':
          entity.videoViews = value || 0;
          break;
      }
    }
  }

  /**
   * Get account insights history
   */
  async getAccountInsightsHistory(
    userId: string,
    clientAccountId: string,
    period: string,
    since: string,
    until: string,
  ): Promise<any[]> {
    const account =
      await this.clientAccountRepository.findById(clientAccountId);
    if (!account || (account as any).userId !== userId) {
      throw new BadRequestException('Unauthorized access to account');
    }

    const cacheKey = `account-history:${clientAccountId}:${period}:${since}:${until}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const insights =
      await this.accountInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        period,
        since,
        until,
      );

    const dtos = insights.map((i) => this.mapAccountInsightToDto(i));

    await this.redisService.set(cacheKey, JSON.stringify(dtos), this.CACHE_TTL);

    return dtos;
  }

  /**
   * Get top performing posts
   */
  async getTopPosts(
    userId: string,
    clientAccountId: string,
    metric: 'engagement' | 'reach' | 'impressions' = 'engagement',
    limit: number = 10,
    since?: string,
    until?: string,
  ): Promise<any[]> {
    const account =
      await this.clientAccountRepository.findById(clientAccountId);
    if (!account || (account as any).userId !== userId) {
      throw new BadRequestException('Unauthorized access to account');
    }

    const posts = await this.mediaInsightRepository.getTopPosts(
      clientAccountId,
      metric,
      Math.min(limit, 100),
      since,
      until,
    );

    return posts.map((p) => this.mapMediaInsightToDto(p));
  }

  /**
   * Get audience demographics
   */
  async getAudienceDemographics(
    userId: string,
    clientAccountId: string,
  ): Promise<any> {
    const account =
      await this.clientAccountRepository.findById(clientAccountId);
    if (!account || (account as any).userId !== userId) {
      throw new BadRequestException('Unauthorized access to account');
    }

    const cacheKey = `audience-demographics:${clientAccountId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get latest account insight with audience data
    const insights =
      await this.accountInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        'day',
        this.formatDate(new Date(Date.now() - 86400000)),
        this.formatDate(new Date()),
      );

    if (!insights || insights.length === 0) {
      throw new NotFoundException('No audience data available');
    }

    const latest = insights[insights.length - 1];

    const result = {
      city: latest.audienceCity || {},
      country: latest.audienceCountry || {},
      genderAge: latest.audienceGenderAge || {},
      locale: latest.audienceLocale || {},
      onlineFollowers: latest.onlineFollowers || {},
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.CACHE_TTL,
    );

    return result;
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    userId: string,
    clientAccountId: string,
    reportType: ReportType,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    this.logger.log(`Generating ${reportType} report for ${clientAccountId}`);

    try {
      const account =
        await this.clientAccountRepository.findById(clientAccountId);
      if (!account || (account as any).userId !== userId) {
        throw new BadRequestException('Unauthorized access to account');
      }

      // Fetch data based on report type
      let summary: any = {};
      let chartsData: any = {};
      let topPosts: any[] = [];
      let insights: any = {};

      switch (reportType) {
        case ReportType.OVERVIEW:
          summary = await this.generateOverviewSummary(
            clientAccountId,
            startDate,
            endDate,
          );
          chartsData = await this.generateOverviewCharts(
            clientAccountId,
            startDate,
            endDate,
          );
          topPosts = await this.getTopPosts(
            userId,
            clientAccountId,
            'engagement',
            5,
            startDate,
            endDate,
          );
          break;

        case ReportType.CONTENT:
          summary = await this.generateContentSummary(
            clientAccountId,
            startDate,
            endDate,
          );
          chartsData = await this.generateContentCharts(
            clientAccountId,
            startDate,
            endDate,
          );
          topPosts = await this.getTopPosts(
            userId,
            clientAccountId,
            'engagement',
            10,
            startDate,
            endDate,
          );
          break;

        case ReportType.AUDIENCE:
          summary = await this.generateAudienceSummary(
            clientAccountId,
            startDate,
            endDate,
          );
          chartsData = await this.generateAudienceCharts(
            clientAccountId,
            startDate,
            endDate,
          );
          insights = await this.getAudienceDemographics(
            userId,
            clientAccountId,
          );
          break;

        case ReportType.ENGAGEMENT:
          summary = await this.generateEngagementSummary(
            clientAccountId,
            startDate,
            endDate,
          );
          chartsData = await this.generateEngagementCharts(
            clientAccountId,
            startDate,
            endDate,
          );
          topPosts = await this.getTopPosts(
            userId,
            clientAccountId,
            'engagement',
            10,
            startDate,
            endDate,
          );
          break;
      }

      // Create report
      const period = this.calculatePeriod(startDate, endDate);
      const report = {
        clientAccountId,
        userId,
        reportType,
        period,
        startDate,
        endDate,
        summary,
        chartsData,
        topPosts,
        insights,
        generatedAt: new Date(),
      };

      const saved = await this.reportRepository.save(report);

      this.logger.log(`Report generated: ${saved.id}`);

      return this.mapReportToDto(saved);
    } catch (error: any) {
      this.logger.error(
        `Error generating report: ${error?.message || 'Unknown error'}`,
        error?.stack,
      );
      throw error;
    }
  }

  /**
   * Generate overview summary
   */
  private async generateOverviewSummary(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const accountInsights =
      await this.accountInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        'day',
        startDate,
        endDate,
      );

    const mediaInsights =
      await this.mediaInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        startDate,
        endDate,
      );

    const totalReach = accountInsights.reduce(
      (sum, i) => sum + (i.reach || 0),
      0,
    );
    const totalImpressions = accountInsights.reduce(
      (sum, i) => sum + (i.impressions || 0),
      0,
    );
    const totalEngagement = mediaInsights.reduce(
      (sum, m) => sum + (m.likeCount || 0) + (m.commentCount || 0),
      0,
    );

    const avgEngagementRate =
      mediaInsights.length > 0
        ? mediaInsights.reduce((sum, m) => sum + (m.engagementRate || 0), 0) /
          mediaInsights.length
        : 0;

    const followerGrowth =
      accountInsights.length > 1
        ? (accountInsights[accountInsights.length - 1].followerCount || 0) -
          (accountInsights[0].followerCount || 0)
        : 0;

    return {
      totalReach,
      totalImpressions,
      totalEngagement,
      averageEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      followerGrowth,
      postsCount: mediaInsights.length,
      profileViews: accountInsights.reduce(
        (sum, i) => sum + (i.profileViews || 0),
        0,
      ),
      websiteClicks: accountInsights.reduce(
        (sum, i) => sum + (i.websiteClicks || 0),
        0,
      ),
    };
  }

  /**
   * Generate overview charts data
   */
  private async generateOverviewCharts(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const insights =
      await this.accountInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        'day',
        startDate,
        endDate,
      );

    return {
      reachOverTime: insights.map((i) => ({ date: i.date, value: i.reach })),
      impressionsOverTime: insights.map((i) => ({
        date: i.date,
        value: i.impressions,
      })),
      followerGrowth: insights.map((i) => ({
        date: i.date,
        value: i.followerCount,
      })),
      profileViews: insights.map((i) => ({
        date: i.date,
        value: i.profileViews,
      })),
    };
  }

  /**
   * Generate content summary
   */
  private async generateContentSummary(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const mediaInsights =
      await this.mediaInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        startDate,
        endDate,
      );

    const totalPosts = mediaInsights.length;
    const totalLikes = mediaInsights.reduce(
      (sum, m) => sum + (m.likeCount || 0),
      0,
    );
    const totalComments = mediaInsights.reduce(
      (sum, m) => sum + (m.commentCount || 0),
      0,
    );
    const totalSaves = mediaInsights.reduce(
      (sum, m) => sum + (m.saved || 0),
      0,
    );
    const totalReach = mediaInsights.reduce(
      (sum, m) => sum + (m.reach || 0),
      0,
    );

    // Group by media type
    const byType = mediaInsights.reduce(
      (acc, m) => {
        const type = m.mediaType || 'unknown';
        if (!acc[type]) acc[type] = 0;
        acc[type]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalPosts,
      totalLikes,
      totalComments,
      totalSaves,
      totalReach,
      averageLikesPerPost:
        totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0,
      averageCommentsPerPost:
        totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0,
      postsByType: byType,
    };
  }

  /**
   * Generate content charts
   */
  private async generateContentCharts(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const mediaInsights =
      await this.mediaInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        startDate,
        endDate,
      );

    // Group by day
    const engagementByDay = mediaInsights.reduce(
      (acc, m) => {
        const day = this.formatDate(m.timestamp);
        if (!acc[day]) {
          acc[day] = { likes: 0, comments: 0, saves: 0 };
        }
        acc[day].likes += m.likeCount || 0;
        acc[day].comments += m.commentCount || 0;
        acc[day].saves += m.saved || 0;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      engagementByDay: Object.entries(engagementByDay).map(
        ([date, data]: any) => ({
          date,
          ...data,
        }),
      ),
      reachByPost: mediaInsights.map((m) => ({
        mediaId: m.mediaIgId,
        reach: m.reach,
        impressions: m.impressions,
      })),
    };
  }

  /**
   * Generate engagement summary
   */
  private async generateEngagementSummary(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const mediaInsights =
      await this.mediaInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        startDate,
        endDate,
      );

    const totalEngagement = mediaInsights.reduce(
      (sum, m) =>
        sum + (m.likeCount || 0) + (m.commentCount || 0) + (m.saved || 0),
      0,
    );

    const avgEngagementRate =
      mediaInsights.length > 0
        ? mediaInsights.reduce((sum, m) => sum + (m.engagementRate || 0), 0) /
          mediaInsights.length
        : 0;

    return {
      totalEngagement,
      averageEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      totalLikes: mediaInsights.reduce((sum, m) => sum + (m.likeCount || 0), 0),
      totalComments: mediaInsights.reduce(
        (sum, m) => sum + (m.commentCount || 0),
        0,
      ),
      totalSaves: mediaInsights.reduce((sum, m) => sum + (m.saved || 0), 0),
      totalShares: mediaInsights.reduce((sum, m) => sum + (m.shares || 0), 0),
    };
  }

  /**
   * Generate engagement charts
   */
  private async generateEngagementCharts(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const mediaInsights =
      await this.mediaInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        startDate,
        endDate,
      );

    return {
      engagementRate: mediaInsights.map((m) => ({
        date: this.formatDate(m.timestamp),
        rate: m.engagementRate,
      })),
      engagementBreakdown: [
        {
          type: 'Likes',
          value: mediaInsights.reduce((sum, m) => sum + (m.likeCount || 0), 0),
        },
        {
          type: 'Comments',
          value: mediaInsights.reduce(
            (sum, m) => sum + (m.commentCount || 0),
            0,
          ),
        },
        {
          type: 'Saves',
          value: mediaInsights.reduce((sum, m) => sum + (m.saved || 0), 0),
        },
        {
          type: 'Shares',
          value: mediaInsights.reduce((sum, m) => sum + (m.shares || 0), 0),
        },
      ],
    };
  }

  /**
   * Generate audience summary
   */
  private async generateAudienceSummary(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const insights =
      await this.accountInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        'day',
        startDate,
        endDate,
      );

    if (insights.length === 0) {
      return {};
    }

    const latest = insights[insights.length - 1];

    return {
      totalFollowers: latest.followerCount,
      followerChange: latest.followerChange,
      topCities: this.getTopItems(latest.audienceCity, 5),
      topCountries: this.getTopItems(latest.audienceCountry, 5),
      genderAgeDistribution: latest.audienceGenderAge,
    };
  }

  /**
   * Generate audience charts
   */
  private async generateAudienceCharts(
    clientAccountId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    const insights =
      await this.accountInsightRepository.findByClientAccountAndDateRange(
        clientAccountId,
        'day',
        startDate,
        endDate,
      );

    return {
      followerGrowth: insights.map((i) => ({
        date: i.date,
        followers: i.followerCount,
        change: i.followerChange,
      })),
    };
  }

  /**
   * Helper: Format date to YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Calculate period label
   */
  private calculatePeriod(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (days === 1) return 'day';
    if (days === 7) return 'week';
    if (days === 28 || days === 30 || days === 31) return 'month';
    return 'custom';
  }

  /**
   * Helper: Get top items from object
   */
  private getTopItems(obj: any, limit: number): any[] {
    if (!obj || typeof obj !== 'object') return [];

    return Object.entries(obj)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, value]) => ({ name: key, value }));
  }

  /**
   * Helper: Map DTOs
   */
  private mapAccountInsightToDto(insight: any): any {
    return {
      id: insight.id,
      date: insight.date,
      period: insight.period,
      followerCount: insight.followerCount,
      followerChange: insight.followerChange,
      reach: insight.reach,
      impressions: insight.impressions,
      profileViews: insight.profileViews,
      websiteClicks: insight.websiteClicks,
      postsCount: insight.postsCount,
      storiesCount: insight.storiesCount,
      audienceCity: insight.audienceCity,
      audienceCountry: insight.audienceCountry,
      audienceGenderAge: insight.audienceGenderAge,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    };
  }

  private mapMediaInsightToDto(insight: any): any {
    return {
      id: insight.id,
      mediaIgId: insight.mediaIgId,
      mediaType: insight.mediaType,
      permalink: insight.permalink,
      caption: insight.caption,
      timestamp: insight.timestamp,
      likeCount: insight.likeCount,
      commentCount: insight.commentCount,
      saved: insight.saved,
      shares: insight.shares,
      reach: insight.reach,
      impressions: insight.impressions,
      engagementRate: insight.engagementRate,
      createdAt: insight.createdAt,
      updatedAt: insight.updatedAt,
    };
  }

  private mapReportToDto(report: any): any {
    return {
      id: report.id,
      reportType: report.reportType,
      period: report.period,
      startDate: report.startDate,
      endDate: report.endDate,
      summary: report.summary,
      chartsData: report.chartsData,
      topPosts: report.topPosts,
      insights: report.insights,
      generatedAt: report.generatedAt,
    };
  }
}
