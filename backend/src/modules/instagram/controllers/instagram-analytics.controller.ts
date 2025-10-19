import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
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
  TopPostsResponseDto,
  InsightPeriod,
  ReportType,
} from '../dto/analytics.dto';

@ApiTags('Instagram Analytics')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('instagram/analytics')
export class InstagramAnalyticsController {
  constructor(private readonly analyticsService: InstagramAnalyticsService) {}

  // ========== Account Insights ==========

  @Post('account/insights')
  @ApiOperation({ summary: 'Fetch and store account insights' })
  @ApiResponse({
    status: 200,
    description: 'Insights fetched successfully',
    type: AccountInsightsResponseDto,
  })
  async fetchAccountInsights(@Request() req: ExpressRequest, @Body() dto: GetAccountInsightsDto) {
    const since = dto.since ? dto.since : undefined;
    const until = dto.until ? dto.until : undefined;

    return this.analyticsService.fetchAccountInsights(
      (req.user as any)?.id,
      dto.clientAccountId,
      dto.period as InsightPeriod,
      since,
      until,
    );
  }

  @Get('account/:clientAccountId')
  @ApiOperation({ summary: 'Get account insights history' })
  @ApiResponse({
    status: 200,
    description: 'Insights retrieved successfully',
    type: [AccountInsightsResponseDto],
  })
  async getAccountInsights(
    @Request() req: ExpressRequest,
    @Param('clientAccountId') clientAccountId: string,
    @Query('period') period: string = 'day',
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const untilDate = until || new Date().toISOString();

    return this.analyticsService.getAccountInsightsHistory(
      (req.user as any)?.id,
      clientAccountId,
      period,
      this.formatDateOnly(sinceDate),
      this.formatDateOnly(untilDate),
    );
  }

  // ========== Media Insights ==========

  @Post('media/:clientAccountId')
  @ApiOperation({ summary: 'Fetch media insights' })
  @ApiResponse({
    status: 200,
    description: 'Media insights fetched successfully',
    type: [MediaInsightsResponseDto],
  })
  async fetchMediaInsights(
    @Request() req: ExpressRequest,
    @Param('clientAccountId') clientAccountId: string,
    @Query('mediaId') mediaId?: string,
  ) {
    return this.analyticsService.fetchMediaInsights((req.user as any)?.id, clientAccountId, mediaId);
  }

  @Get('media/top/:clientAccountId')
  @ApiOperation({ summary: 'Get top performing posts' })
  @ApiResponse({
    status: 200,
    description: 'Top posts retrieved successfully',
    type: TopPostsResponseDto,
  })
  async getTopPosts(
    @Request() req: ExpressRequest,
    @Param('clientAccountId') clientAccountId: string,
    @Query('metric') metric: 'engagement' | 'reach' | 'impressions' = 'engagement',
    @Query('limit') limit: number = 10,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const posts = await this.analyticsService.getTopPosts(
      (req.user as any)?.id,
      clientAccountId,
      metric,
      limit,
      since ? this.formatDateOnly(since) : undefined,
      until ? this.formatDateOnly(until) : undefined,
    );

    return {
      posts,
      metric,
      period: {
        startDate: since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: until || new Date().toISOString(),
      },
    };
  }

  // ========== Audience ==========

  @Get('audience/:clientAccountId')
  @ApiOperation({ summary: 'Get audience demographics' })
  @ApiResponse({
    status: 200,
    description: 'Audience data retrieved successfully',
    type: AudienceDemographicsDto,
  })
  async getAudienceDemographics(
    @Request() req: ExpressRequest,
    @Param('clientAccountId') clientAccountId: string,
  ) {
    return this.analyticsService.getAudienceDemographics((req.user as any)?.id, clientAccountId);
  }

  // ========== Reports ==========

  @Post('reports')
  @ApiOperation({ summary: 'Generate analytics report' })
  @ApiResponse({
    status: 201,
    description: 'Report generated successfully',
    type: AnalyticsReportResponseDto,
  })
  async generateReport(@Request() req: ExpressRequest, @Body() dto: GenerateReportDto) {
    return this.analyticsService.generateReport(
      (req.user as any)?.id,
      dto.clientAccountId,
      dto.reportType as ReportType,
      this.formatDateOnly(dto.startDate),
      this.formatDateOnly(dto.endDate),
    );
  }

  @Get('reports/:clientAccountId')
  @ApiOperation({ summary: 'List analytics reports' })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
    type: [AnalyticsReportResponseDto],
  })
  async listReports(
    @Request() req: ExpressRequest,
    @Param('clientAccountId') clientAccountId: string,
    @Query('limit') limit: number = 10,
  ) {
    // This would need to be implemented in the service
    return {
      message: 'List reports endpoint - to be implemented with pagination',
      limit,
    };
  }

  // ========== Utility Methods ==========

  private formatDateOnly(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
