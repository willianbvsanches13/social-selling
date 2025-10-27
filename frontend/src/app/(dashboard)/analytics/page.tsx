'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format as formatDate, subDays } from 'date-fns';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { RefreshCw, TrendingUp, Users, Heart, BarChart3, Eye } from 'lucide-react';
import { analyticsService } from '@/lib/services/analytics.service';
import { MetricCard } from '@/components/analytics/MetricCard';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { TopPostsGrid } from '@/components/analytics/TopPostsGrid';
import { DemographicsTable } from '@/components/analytics/DemographicsTable';
import { ExportMenu } from '@/components/analytics/ExportMenu';
import { ChartContainer } from '@/components/analytics/ChartContainer';
import { InsightsPanel } from '@/components/analytics/InsightsPanel';
import toast, { Toaster } from 'react-hot-toast';

interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: string;
}

interface AnalyticsData {
  overview: {
    followers: number;
    followersChange: number;
    engagement: number;
    engagementChange: number;
    posts: number;
    postsChange: number;
    reach: number;
    reachChange: number;
    impressions: number;
    impressionsChange: number;
    avgLikes: number;
    avgLikesChange: number;
  };
  engagementOverTime: Array<{
    date: string;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }>;
  topPosts: Array<{
    id: string;
    imageUrl?: string;
    thumbnailUrl?: string;
    caption: string;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    engagementRate: number;
    timestamp: string;
  }>;
  demographics: {
    ageGroups: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    gender: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    metric?: string;
  }>;
}

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  neutral: '#6b7280',
};

const AGE_GROUP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6'];

export default function AnalyticsPage() {
  const [selectedAccountId] = useState<string>('default-account');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    preset: 'last30Days',
  });
  const [compareMode, setCompareMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState(['likes', 'comments', 'shares', 'saves']);
  const [isExporting, setIsExporting] = useState(false);

  // Mock data for demonstration
  const mockAnalyticsData: AnalyticsData = {
    overview: {
      followers: 15234,
      followersChange: 5.2,
      engagement: 3456,
      engagementChange: 12.4,
      posts: 45,
      postsChange: 8.3,
      reach: 125000,
      reachChange: 15.6,
      impressions: 198000,
      impressionsChange: -3.2,
      avgLikes: 287,
      avgLikesChange: 6.8,
    },
    engagementOverTime: Array.from({ length: 30 }, (_, i) => ({
      date: subDays(new Date(), 29 - i).toISOString(),
      likes: Math.floor(Math.random() * 500) + 200,
      comments: Math.floor(Math.random() * 50) + 10,
      shares: Math.floor(Math.random() * 30) + 5,
      saves: Math.floor(Math.random() * 40) + 10,
    })),
    topPosts: Array.from({ length: 12 }, (_, i) => ({
      id: `post-${i}`,
      thumbnailUrl: `https://picsum.photos/seed/${i}/400/400`,
      caption: `Amazing post content ${i + 1}! 🔥 #instagram #marketing #socialmedia`,
      likes: Math.floor(Math.random() * 1000) + 500,
      comments: Math.floor(Math.random() * 100) + 20,
      saves: Math.floor(Math.random() * 50) + 10,
      shares: Math.floor(Math.random() * 30) + 5,
      engagementRate: Math.random() * 10 + 2,
      timestamp: subDays(new Date(), i).toISOString(),
    })),
    demographics: {
      ageGroups: [
        { range: '18-24', count: 3521, percentage: 23.1 },
        { range: '25-34', count: 5876, percentage: 38.6 },
        { range: '35-44', count: 3234, percentage: 21.2 },
        { range: '45-54', count: 1756, percentage: 11.5 },
        { range: '55+', count: 847, percentage: 5.6 },
      ],
      gender: [
        { type: 'Male', count: 7234, percentage: 47.5 },
        { type: 'Female', count: 7000, percentage: 45.9 },
        { type: 'Other', count: 1000, percentage: 6.6 },
      ],
    },
    insights: [
      {
        type: 'positive',
        title: 'Strong Engagement Growth',
        description: 'Your engagement rate has increased by 12.4% compared to the previous period, indicating better content resonance with your audience.',
        metric: '+12.4% Engagement',
      },
      {
        type: 'positive',
        title: 'Expanding Reach',
        description: 'Your content is reaching 15.6% more unique users this period, showing effective hashtag and content strategy.',
        metric: '+15.6% Reach',
      },
      {
        type: 'neutral',
        title: 'Optimal Posting Times',
        description: 'Your audience is most active between 6-9 PM. Consider scheduling more content during these peak hours.',
      },
    ],
  };

  // Fetch analytics data - using mock data for now
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['analytics', selectedAccountId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockAnalyticsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
      toast.success('Analytics data refreshed');
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Analytics refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh analytics');
    }
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    setIsExporting(true);
    try {
      const exportData = {
        dateRange: {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString(),
        },
        data: analyticsData,
      };

      // TODO: Implementar endpoints de export no backend
      // let blob: Blob;
      let filename: string;

      switch (format) {
        case 'pdf':
          // blob = await analyticsService.exportToPDF(exportData);
          filename = `analytics-${formatDate(dateRange.startDate, 'yyyy-MM-dd')}-to-${formatDate(dateRange.endDate, 'yyyy-MM-dd')}.pdf`;
          break;
        case 'csv':
          // blob = await analyticsService.exportToCSV(exportData);
          filename = `analytics-${formatDate(dateRange.startDate, 'yyyy-MM-dd')}-to-${formatDate(dateRange.endDate, 'yyyy-MM-dd')}.csv`;
          break;
        case 'excel':
          // blob = await analyticsService.exportToExcel(exportData);
          filename = `analytics-${formatDate(dateRange.startDate, 'yyyy-MM-dd')}-to-${formatDate(dateRange.endDate, 'yyyy-MM-dd')}.xlsx`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Temporarily show error message until backend implements export endpoints
      throw new Error('Export feature is not yet implemented. Coming soon!');

      // TODO: Uncomment when backend export endpoints are implemented
      // // Create download link
      // const url = window.URL.createObjectURL(blob);
      // const link = document.createElement('a');
      // link.href = url;
      // link.download = filename;
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
      // window.URL.revokeObjectURL(url);

      // toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export analytics');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Analytics</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track your Instagram performance and audience insights
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-refresh</span>
              </label>

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Refresh analytics"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Export menu */}
              <ExportMenu onExport={handleExport} isExporting={isExporting} />

              {/* Date range picker */}
              <DateRangePicker
                dateRange={dateRange}
                onChange={handleDateRangeChange}
                compareMode={compareMode}
                onCompareModeChange={setCompareMode}
              />
            </div>
          </div>

          {/* Last updated */}
          {analyticsData && (
            <div className="mt-2 text-xs text-gray-500">
              Last updated: {formatDate(new Date(), 'MMM dd, yyyy HH:mm')}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <MetricCard
            title="Total Followers"
            value={analyticsData?.overview.followers || 0}
            change={analyticsData?.overview.followersChange || 0}
            icon={Users}
            isLoading={isLoading}
            format="number"
          />
          <MetricCard
            title="Engagement Rate"
            value={analyticsData?.overview.engagement || 0}
            change={analyticsData?.overview.engagementChange || 0}
            icon={Heart}
            isLoading={isLoading}
            format="percentage"
          />
          <MetricCard
            title="Total Posts"
            value={analyticsData?.overview.posts || 0}
            change={analyticsData?.overview.postsChange || 0}
            icon={BarChart3}
            isLoading={isLoading}
            format="number"
          />
          <MetricCard
            title="Reach"
            value={analyticsData?.overview.reach || 0}
            change={analyticsData?.overview.reachChange || 0}
            icon={Eye}
            isLoading={isLoading}
            format="compact"
          />
          <MetricCard
            title="Impressions"
            value={analyticsData?.overview.impressions || 0}
            change={analyticsData?.overview.impressionsChange || 0}
            icon={TrendingUp}
            isLoading={isLoading}
            format="compact"
          />
          <MetricCard
            title="Avg. Likes"
            value={analyticsData?.overview.avgLikes || 0}
            change={analyticsData?.overview.avgLikesChange || 0}
            icon={Heart}
            isLoading={isLoading}
            format="number"
          />
        </div>

        {/* Insights Panel */}
        {analyticsData?.insights && analyticsData.insights.length > 0 && (
          <InsightsPanel insights={analyticsData.insights} className="mb-8" />
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Engagement Over Time */}
          <ChartContainer
            title="Engagement Over Time"
            description="Track your engagement metrics across the selected period"
            isLoading={isLoading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData?.engagementOverTime || []}>
                <defs>
                  <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSaves" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.warning} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => formatDate(new Date(value), 'MMM dd')}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => formatDate(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                {selectedMetrics.includes('likes') && (
                  <Area
                    type="monotone"
                    dataKey="likes"
                    stroke={CHART_COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorLikes)"
                  />
                )}
                {selectedMetrics.includes('comments') && (
                  <Area
                    type="monotone"
                    dataKey="comments"
                    stroke={CHART_COLORS.secondary}
                    fillOpacity={1}
                    fill="url(#colorComments)"
                  />
                )}
                {selectedMetrics.includes('shares') && (
                  <Area
                    type="monotone"
                    dataKey="shares"
                    stroke={CHART_COLORS.success}
                    fillOpacity={1}
                    fill="url(#colorShares)"
                  />
                )}
                {selectedMetrics.includes('saves') && (
                  <Area
                    type="monotone"
                    dataKey="saves"
                    stroke={CHART_COLORS.warning}
                    fillOpacity={1}
                    fill="url(#colorSaves)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>

            {/* Metric toggles */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
              {['likes', 'comments', 'shares', 'saves'].map((metric) => (
                <button
                  key={metric}
                  onClick={() => toggleMetric(metric)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedMetrics.includes(metric)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </ChartContainer>

          {/* Post Performance Bar Chart */}
          <ChartContainer
            title="Post Performance"
            description="Your top performing posts by engagement"
            isLoading={isLoading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analyticsData?.topPosts.slice(0, 10).map((post) => ({
                  caption: post.caption.substring(0, 20) + '...',
                  engagement: post.engagementRate,
                  likes: post.likes,
                  comments: post.comments,
                }))}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis type="category" dataKey="caption" stroke="#6b7280" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="engagement" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="Engagement Rate" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Age Demographics Pie Chart */}
          <ChartContainer
            title="Audience by Age"
            description="Follower distribution across age groups"
            isLoading={isLoading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData?.demographics.ageGroups || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, percentage }) => `${range}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData?.demographics.ageGroups.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AGE_GROUP_COLORS[index % AGE_GROUP_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Gender Demographics Donut Chart */}
          <ChartContainer
            title="Audience by Gender"
            description="Follower distribution by gender"
            isLoading={isLoading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData?.demographics.gender || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData?.demographics.gender.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Top Posts Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performing Posts</h2>
          <TopPostsGrid posts={analyticsData?.topPosts || []} isLoading={isLoading} />
        </div>

        {/* Demographics Table */}
        <DemographicsTable demographics={analyticsData?.demographics} isLoading={isLoading} />
      </div>
    </div>
  );
}
