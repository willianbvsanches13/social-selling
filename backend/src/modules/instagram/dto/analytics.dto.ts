import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
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

// ============= Account Insights DTOs =============

export class GetAccountInsightsDto {
  @ApiProperty({ description: 'Client account ID' })
  @IsString()
  clientAccountId!: string;

  @ApiProperty({ description: 'Insight period', enum: InsightPeriod })
  @IsEnum(InsightPeriod)
  period!: InsightPeriod;

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
  id!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  period!: string;

  @ApiProperty()
  followerCount!: number;

  @ApiProperty()
  followerChange!: number;

  @ApiProperty()
  reach!: number;

  @ApiProperty()
  impressions!: number;

  @ApiProperty()
  profileViews!: number;

  @ApiProperty()
  websiteClicks!: number;

  @ApiProperty()
  postsCount!: number;

  @ApiProperty()
  storiesCount!: number;

  @ApiProperty()
  audienceCity!: Record<string, number>;

  @ApiProperty()
  audienceCountry!: Record<string, number>;

  @ApiProperty()
  audienceGenderAge!: Record<string, number>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ============= Media Insights DTOs =============

export class GetMediaInsightsDto {
  @ApiPropertyOptional({ description: 'Media Instagram ID' })
  @IsOptional()
  @IsString()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Get top N posts by engagement' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
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
  id!: string;

  @ApiProperty()
  mediaIgId!: string;

  @ApiProperty()
  mediaType!: string;

  @ApiProperty()
  permalink!: string;

  @ApiProperty()
  caption!: string;

  @ApiProperty()
  timestamp!: Date;

  @ApiProperty()
  likeCount!: number;

  @ApiProperty()
  commentCount!: number;

  @ApiProperty()
  saved!: number;

  @ApiProperty()
  shares!: number;

  @ApiProperty()
  reach!: number;

  @ApiProperty()
  impressions!: number;

  @ApiProperty()
  engagementRate!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

// ============= Report Generation DTOs =============

export class GenerateReportDto {
  @ApiProperty({ description: 'Client account ID' })
  @IsString()
  clientAccountId!: string;

  @ApiProperty({ description: 'Report type', enum: ReportType })
  @IsEnum(ReportType)
  reportType!: ReportType;

  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString()
  endDate!: string;
}

export class AnalyticsReportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ReportType })
  reportType!: ReportType;

  @ApiProperty()
  period!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty()
  summary!: {
    totalReach: number;
    totalImpressions: number;
    totalEngagement: number;
    averageEngagementRate: number;
    followerGrowth: number;
    topPostsCount: number;
    profileViews: number;
    websiteClicks: number;
  };

  @ApiProperty()
  chartsData!: Record<string, any>;

  @ApiProperty()
  topPosts!: MediaInsightsResponseDto[];

  @ApiProperty()
  insights!: Record<string, any>;

  @ApiProperty()
  generatedAt!: Date;
}

// ============= Audience Demographics DTOs =============

export class AudienceDemographicsDto {
  @ApiProperty()
  city!: Record<string, number>;

  @ApiProperty()
  country!: Record<string, number>;

  @ApiProperty()
  genderAge!: Record<string, number>;

  @ApiProperty()
  locale!: Record<string, number>;

  @ApiProperty()
  onlineFollowers!: Record<string, any>;
}

export class AudienceInsightsDto {
  @ApiProperty()
  totalFollowers!: number;

  @ApiProperty()
  followerChange!: number;

  @ApiProperty()
  topCities!: Array<{ name: string; value: number }>;

  @ApiProperty()
  topCountries!: Array<{ name: string; value: number }>;

  @ApiProperty()
  genderAgeDistribution!: Record<string, number>;
}

// ============= Engagement Metrics DTOs =============

export class EngagementMetricsDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  likes!: number;

  @ApiProperty()
  comments!: number;

  @ApiProperty()
  saves!: number;

  @ApiProperty()
  shares!: number;

  @ApiProperty()
  engagementRate!: number;
}

export class TopPostsResponseDto {
  @ApiProperty()
  posts!: MediaInsightsResponseDto[];

  @ApiProperty()
  metric!: 'engagement' | 'reach' | 'impressions';

  @ApiProperty()
  period!: {
    startDate: string;
    endDate: string;
  };
}

// ============= Analytics History DTOs =============

export class AnalyticsHistoryDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  period!: string;

  @ApiProperty()
  dataPoints!: AccountInsightsResponseDto[];

  @ApiProperty()
  since!: string;

  @ApiProperty()
  until!: string;
}

export class MetricTrendDto {
  @ApiProperty()
  metric!: string;

  @ApiProperty()
  trend!: 'up' | 'down' | 'stable';

  @ApiProperty()
  percentageChange!: number;

  @ApiProperty()
  currentValue!: number;

  @ApiProperty()
  previousValue!: number;
}
