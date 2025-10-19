export interface AnalyticsOverview {
  totalFollowers: number;
  followerChange: number;
  totalReach: number;
  reachChange: number;
  totalEngagement: number;
  engagementChange: number;
  totalImpressions: number;
  impressionsChange: number;
  engagementRate: number;
  engagementRateChange: number;
  period: {
    start: string;
    end: string;
  };
}

export interface EngagementDataPoint {
  date: string;
  engagement: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export interface FollowerGrowthDataPoint {
  date: string;
  followers: number;
  change: number;
}

export interface TopPost {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'STORY' | 'REEL';
  caption: string;
  thumbnailUrl: string;
  permalink: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement: number;
  engagementRate: number;
}

export interface AudienceInsights {
  topCities: Array<{
    city: string;
    percentage: number;
  }>;
  topCountries: Array<{
    country: string;
    percentage: number;
  }>;
  ageGenderDistribution: Array<{
    ageRange: string;
    male: number;
    female: number;
  }>;
  onlineFollowers: Array<{
    hour: number;
    count: number;
  }>;
}

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
  period: 'today' | '7d' | '30d' | '90d' | 'custom';
}

export interface AnalyticsFilters {
  accountId?: string;
  dateRange: AnalyticsDateRange;
  metric?: 'engagement' | 'reach' | 'impressions' | 'followers';
}

export interface ExportDataOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeCharts?: boolean;
  dateRange: AnalyticsDateRange;
}
