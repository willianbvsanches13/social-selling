import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  AnalyticsOverview,
  EngagementDataPoint,
  FollowerGrowthDataPoint,
  TopPost,
  AudienceInsights,
  AnalyticsDateRange,
} from '@/types/analytics';

export const analyticsService = {
  /**
   * Get analytics overview for the current period
   */
  async getOverview(accountId: string, dateRange: AnalyticsDateRange): Promise<AnalyticsOverview> {
    const params = new URLSearchParams({
      accountId,
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
    });

    const response = await apiClient.get<AnalyticsOverview>(
      `${API_ENDPOINTS.ANALYTICS_ACCOUNT_INSIGHTS}?${params.toString()}`
    );
    return response.data!;
  },

  /**
   * Get engagement data for charting
   */
  async getEngagementData(
    accountId: string,
    dateRange: AnalyticsDateRange
  ): Promise<EngagementDataPoint[]> {
    const params = new URLSearchParams({
      accountId,
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      metrics: 'engagement,reach,impressions,likes,comments,shares,saves',
    });

    const response = await apiClient.get<EngagementDataPoint[]>(
      `${API_ENDPOINTS.ANALYTICS_ACCOUNT_INSIGHTS_HISTORY(accountId)}?${params.toString()}`
    );
    return response.data || [];
  },

  /**
   * Get follower growth data for charting
   */
  async getFollowerGrowth(
    accountId: string,
    dateRange: AnalyticsDateRange
  ): Promise<FollowerGrowthDataPoint[]> {
    const params = new URLSearchParams({
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      metrics: 'follower_count',
    });

    const response = await apiClient.get<FollowerGrowthDataPoint[]>(
      `${API_ENDPOINTS.ANALYTICS_ACCOUNT_INSIGHTS_HISTORY(accountId)}?${params.toString()}`
    );
    return response.data || [];
  },

  /**
   * Get top performing posts
   */
  async getTopPosts(
    accountId: string,
    dateRange: AnalyticsDateRange,
    limit: number = 10
  ): Promise<TopPost[]> {
    const params = new URLSearchParams({
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      limit: limit.toString(),
      sortBy: 'engagement',
      sortOrder: 'desc',
    });

    const response = await apiClient.get<TopPost[]>(
      `${API_ENDPOINTS.ANALYTICS_TOP_POSTS(accountId)}?${params.toString()}`
    );
    return response.data || [];
  },

  /**
   * Get audience insights
   */
  async getAudienceInsights(accountId: string): Promise<AudienceInsights> {
    const response = await apiClient.get<AudienceInsights>(
      API_ENDPOINTS.ANALYTICS_AUDIENCE(accountId)
    );
    return response.data!;
  },

  /**
   * Export analytics data
   */
  async exportData(
    accountId: string,
    dateRange: AnalyticsDateRange,
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    const params = new URLSearchParams({
      accountId,
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
      format,
    });

    const response = await apiClient.get<Blob>(
      `${API_ENDPOINTS.ANALYTICS_REPORTS}?${params.toString()}`,
      {
        responseType: 'blob',
      }
    );
    return response.data!;
  },
};
