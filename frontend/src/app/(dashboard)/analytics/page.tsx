'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Users, Eye, Heart, BarChart3 } from 'lucide-react';
import { analyticsService } from '@/lib/services/analytics.service';
import { AnalyticsDateRange } from '@/types/analytics';
import { OverviewCard } from '@/components/analytics/OverviewCard';
import { EngagementChart } from '@/components/analytics/EngagementChart';
import { FollowerGrowthChart } from '@/components/analytics/FollowerGrowthChart';
import { TopPostsTable } from '@/components/analytics/TopPostsTable';
import { DateRangeSelector } from '@/components/analytics/DateRangeSelector';
import { ExportButton } from '@/components/analytics/ExportButton';

export default function AnalyticsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
    period: '30d',
  });

  // Fetch overview data
  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['analytics-overview', selectedAccountId, dateRange],
    queryFn: () => analyticsService.getOverview(selectedAccountId, dateRange),
    enabled: !!selectedAccountId,
  });

  // Fetch engagement data
  const { data: engagementData, isLoading: isLoadingEngagement } = useQuery({
    queryKey: ['analytics-engagement', selectedAccountId, dateRange],
    queryFn: () => analyticsService.getEngagementData(selectedAccountId, dateRange),
    enabled: !!selectedAccountId,
  });

  // Fetch follower growth data
  const { data: followerData, isLoading: isLoadingFollowers } = useQuery({
    queryKey: ['analytics-followers', selectedAccountId, dateRange],
    queryFn: () => analyticsService.getFollowerGrowth(selectedAccountId, dateRange),
    enabled: !!selectedAccountId,
  });

  // Fetch top posts
  const { data: topPosts, isLoading: isLoadingTopPosts } = useQuery({
    queryKey: ['analytics-top-posts', selectedAccountId, dateRange],
    queryFn: () => analyticsService.getTopPosts(selectedAccountId, dateRange, 10),
    enabled: !!selectedAccountId,
  });

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  if (!selectedAccountId) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center" data-testid="empty-state">
          <BarChart3 className="mx-auto h-16 w-16 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">No Account Selected</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please select an Instagram account to view analytics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track your Instagram performance and insights
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <ExportButton accountId={selectedAccountId} dateRange={dateRange} />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Total Followers"
          value={formatNumber(overview?.totalFollowers || 0)}
          change={overview?.followerChange || 0}
          changeText={formatPercentage(overview?.followerChange || 0)}
          icon={Users}
          isLoading={isLoadingOverview}
        />

        <OverviewCard
          title="Total Reach"
          value={formatNumber(overview?.totalReach || 0)}
          change={overview?.reachChange || 0}
          changeText={formatPercentage(overview?.reachChange || 0)}
          icon={Eye}
          isLoading={isLoadingOverview}
        />

        <OverviewCard
          title="Total Engagement"
          value={formatNumber(overview?.totalEngagement || 0)}
          change={overview?.engagementChange || 0}
          changeText={formatPercentage(overview?.engagementChange || 0)}
          icon={Heart}
          isLoading={isLoadingOverview}
        />

        <OverviewCard
          title="Engagement Rate"
          value={`${(overview?.engagementRate || 0).toFixed(2)}%`}
          change={overview?.engagementRateChange || 0}
          changeText={formatPercentage(overview?.engagementRateChange || 0)}
          icon={TrendingUp}
          isLoading={isLoadingOverview}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Engagement Trend</h2>
          <EngagementChart data={engagementData || []} isLoading={isLoadingEngagement} />
        </div>

        {/* Follower Growth Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Follower Growth</h2>
          <FollowerGrowthChart data={followerData || []} isLoading={isLoadingFollowers} />
        </div>
      </div>

      {/* Top Posts Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Performing Posts</h2>
        <TopPostsTable posts={topPosts || []} isLoading={isLoadingTopPosts} />
      </div>
    </div>
  );
}
