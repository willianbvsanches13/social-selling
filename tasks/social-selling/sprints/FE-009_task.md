# FE-009: Analytics Dashboard

## Epic
Frontend Development - Phase 3

## Story
As a social media manager, I want to view comprehensive analytics about my Instagram content performance so that I can make data-driven decisions about my content strategy and understand what resonates with my audience.

## Description
Build a comprehensive analytics dashboard that displays Instagram performance metrics through various visualization types. The dashboard should provide insights into engagement trends, post performance, audience demographics, and allow users to compare data across different time periods. All data should be presented in an intuitive, visually appealing way using modern chart libraries.

## Priority
HIGH

## Estimated Story Points
13

## Acceptance Criteria

1. **Overview Statistics Cards**
   - Display 4-6 key metric cards at the top of the dashboard
   - Each card shows: metric value, percentage change, trend indicator (up/down arrow)
   - Metrics include: Total Followers, Engagement Rate, Total Posts, Reach, Impressions, Average Likes
   - Cards should have subtle animations on load
   - Skeleton loading state while data fetches
   - Responsive grid layout (4 cols desktop, 2 cols tablet, 1 col mobile)

2. **Engagement Over Time Line Chart**
   - Interactive line chart showing engagement metrics over selected time period
   - Multiple data series: Likes, Comments, Shares, Saves
   - Toggleable legend to show/hide specific metrics
   - Tooltip on hover showing exact values with date
   - Responsive chart that adapts to screen size
   - Smooth animations when data updates
   - Y-axis auto-scales based on data range
   - X-axis shows appropriate date labels based on period

3. **Post Performance Bar Chart**
   - Horizontal or vertical bar chart showing top 10 posts by engagement
   - Each bar shows post thumbnail, caption preview, and engagement count
   - Clickable bars that navigate to post detail view
   - Color-coded bars based on performance tier (excellent/good/average/poor)
   - Sorting options: Most likes, Most comments, Most saves, Best engagement rate
   - Tooltip showing detailed metrics on hover

4. **Audience Demographics Pie Chart**
   - Pie chart showing follower distribution by age group
   - Donut chart showing follower gender distribution
   - Interactive segments with percentage labels
   - Smooth animation on load and data changes
   - Legend with color coding
   - Center label showing total followers count

5. **Date Range Picker Component**
   - Custom date range picker with preset options
   - Presets: Last 7 days, Last 30 days, Last 90 days, This month, Last month, Custom range
   - Calendar dropdown for custom date selection
   - "Compare to previous period" toggle
   - Apply/Cancel buttons
   - Selected range displays prominently
   - Validation: End date cannot be before start date
   - Maximum range limit (e.g., 365 days)

6. **Top Performing Posts Grid**
   - Grid layout displaying top 12 performing posts
   - Each post card shows: thumbnail, caption snippet, like count, comment count, engagement rate
   - Hover effect reveals additional metrics
   - Click to view full post details
   - Filter options: All posts, Photos only, Videos only, Carousels only
   - Sort options: Most recent, Most likes, Best engagement
   - Pagination or infinite scroll for more posts

7. **Audience Demographics Table**
   - Detailed table showing follower demographics
   - Columns: Age range, Gender, Count, Percentage, Growth
   - Sortable columns
   - Search/filter functionality
   - Export to CSV button
   - Responsive table with horizontal scroll on mobile
   - Row highlighting on hover

8. **Export Analytics Functionality**
   - Export button with dropdown: PDF, CSV, Excel
   - PDF export includes: Cover page, all charts as images, data tables
   - CSV export includes: Raw data for all metrics
   - Date range included in exported file name
   - Loading indicator during export generation
   - Success toast notification when export completes
   - Error handling for export failures

9. **Real-time Data Refresh**
   - Manual refresh button in header
   - Auto-refresh toggle option
   - Last updated timestamp display
   - Loading indicator during refresh
   - Refresh all charts simultaneously
   - Optimistic UI updates
   - Debounced refresh to prevent excessive API calls

10. **Period Comparison Feature**
    - Toggle to enable comparison mode
    - Shows previous period data as lighter colored overlay on charts
    - Percentage change indicators on all metrics
    - Comparison period automatically calculated based on selected range
    - Clear visual distinction between current and comparison data
    - Comparison data in separate columns in tables

11. **Responsive Layout**
    - Mobile-first design approach
    - Charts stack vertically on mobile devices
    - Touch-friendly chart interactions
    - Simplified view on small screens
    - Hamburger menu for filters on mobile
    - Optimized chart sizes for different breakpoints

12. **Loading States**
    - Skeleton screens for all chart components
    - Shimmer effect on loading elements
    - Progressive loading: Cards load first, then charts
    - Smooth transition from loading to loaded state
    - No layout shift during loading

13. **Error Handling**
    - Graceful error messages if data fails to load
    - Retry button for failed data fetches
    - Empty state when no data available
    - Helpful messages guiding users on next steps
    - Chart-specific error boundaries

14. **Accessibility**
    - Keyboard navigation support for all interactive elements
    - ARIA labels for charts and graphs
    - Screen reader friendly data tables
    - Color contrast meeting WCAG AA standards
    - Focus indicators on all focusable elements
    - Alt text for all images and icons

15. **Performance Optimization**
    - Lazy loading for charts below the fold
    - Memoized chart components to prevent unnecessary re-renders
    - Debounced API calls for filter changes
    - Virtual scrolling for long data tables
    - Code splitting for chart libraries
    - Optimized bundle size

16. **Chart Interactivity**
    - Zoom and pan functionality on time-series charts
    - Click chart elements to drill down into details
    - Legend toggle to show/hide data series
    - Crosshair cursor showing values across all visible series
    - Reset zoom button
    - Full screen mode for individual charts

17. **Data Filtering**
    - Filter by post type: All, Photos, Videos, Carousels, Stories
    - Filter by performance tier: All, Top performers, Average, Underperformers
    - Filter by engagement type: Likes, Comments, Saves, Shares
    - Multiple filters can be applied simultaneously
    - Active filters displayed as removable chips
    - Clear all filters button

18. **Metric Customization**
    - Users can select which metrics to display on dashboard
    - Drag and drop to reorder metric cards
    - Show/hide specific charts
    - Save preferred dashboard layout
    - Reset to default layout option

19. **Data Accuracy Indicators**
    - Display data source and last sync time
    - Instagram API rate limit status indicator
    - Estimated vs actual data disclaimer where applicable
    - Data freshness indicators (real-time, cached, historical)

20. **Insights and Recommendations**
    - AI-generated insights card highlighting key findings
    - Trend indicators: Rising, Falling, Stable
    - Best posting time recommendations based on engagement data
    - Content type recommendations based on performance
    - Automated insights update with data refresh

21. **Export Scheduling**
    - Schedule automated weekly/monthly analytics reports
    - Email delivery of scheduled reports
    - Report template customization
    - Report recipients management
    - Report history and download previous reports

22. **Custom Metrics Calculation**
    - Engagement rate formula: (Likes + Comments + Saves) / Followers * 100
    - Reach calculation from Instagram API data
    - Growth rate percentage calculations
    - Average engagement per post
    - Best performing time slots
    - Follower growth velocity

## Technical Implementation Details

### Component Structure

```typescript
// src/app/analytics/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  LineChart,
  Line,
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
import { Calendar, Download, RefreshCw, TrendingUp, TrendingDown, Users, Heart, MessageCircle, BarChart3 } from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import { MetricCard } from '@/components/analytics/MetricCard';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { TopPostsGrid } from '@/components/analytics/TopPostsGrid';
import { DemographicsTable } from '@/components/analytics/DemographicsTable';
import { ExportMenu } from '@/components/analytics/ExportMenu';
import { ChartContainer } from '@/components/analytics/ChartContainer';
import { InsightsPanel } from '@/components/analytics/InsightsPanel';
import { useAnalytics } from '@/hooks/useAnalytics';
import { toast } from 'react-hot-toast';

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
    imageUrl: string;
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

const PRESET_RANGES = {
  last7Days: { label: 'Last 7 days', days: 7 },
  last30Days: { label: 'Last 30 days', days: 30 },
  last90Days: { label: 'Last 90 days', days: 90 },
  thisMonth: { label: 'This month', custom: 'thisMonth' },
  lastMonth: { label: 'Last month', custom: 'lastMonth' },
};

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
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    preset: 'last30Days',
  });
  const [compareMode, setCompareMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState(['likes', 'comments', 'shares', 'saves']);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ['analytics', dateRange.startDate, dateRange.endDate],
    queryFn: () =>
      analyticsService.getAnalytics({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch comparison data if compare mode is enabled
  const {
    data: comparisonData,
  } = useQuery<AnalyticsData>({
    queryKey: ['analytics-comparison', dateRange.startDate, dateRange.endDate],
    queryFn: () => {
      const daysDiff = Math.ceil(
        (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const comparisonStart = subDays(dateRange.startDate, daysDiff);
      const comparisonEnd = subDays(dateRange.endDate, daysDiff);

      return analyticsService.getAnalytics({
        startDate: comparisonStart.toISOString(),
        endDate: comparisonEnd.toISOString(),
      });
    },
    enabled: compareMode,
    staleTime: 5 * 60 * 1000,
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

      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'pdf':
          blob = await analyticsService.exportToPDF(exportData);
          filename = `analytics-${format(dateRange.startDate, 'yyyy-MM-dd')}-to-${format(dateRange.endDate, 'yyyy-MM-dd')}.pdf`;
          break;
        case 'csv':
          blob = await analyticsService.exportToCSV(exportData);
          filename = `analytics-${format(dateRange.startDate, 'yyyy-MM-dd')}-to-${format(dateRange.endDate, 'yyyy-MM-dd')}.csv`;
          break;
        case 'excel':
          blob = await analyticsService.exportToExcel(exportData);
          filename = `analytics-${format(dateRange.startDate, 'yyyy-MM-dd')}-to-${format(dateRange.endDate, 'yyyy-MM-dd')}.xlsx`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Analytics exported as ${format.toUpperCase()}`);
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
              Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
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
            icon={TrendingUp}
            isLoading={isLoading}
            format="compact"
          />
          <MetricCard
            title="Impressions"
            value={analyticsData?.overview.impressions || 0}
            change={analyticsData?.overview.impressionsChange || 0}
            icon={BarChart3}
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
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
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
                <Bar dataKey="engagement" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
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
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-2xl font-bold fill-gray-900"
                >
                  {analyticsData?.overview.followers.toLocaleString()}
                </text>
                <text
                  x="50%"
                  y="55%"
                  dy={20}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-sm fill-gray-600"
                >
                  Total Followers
                </text>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Top Posts Grid */}
        <TopPostsGrid posts={analyticsData?.topPosts || []} isLoading={isLoading} className="mb-8" />

        {/* Demographics Table */}
        <DemographicsTable demographics={analyticsData?.demographics} isLoading={isLoading} />
      </div>
    </div>
  );
}
```

```typescript
// src/components/analytics/MetricCard.tsx
import { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  icon: LucideIcon;
  isLoading?: boolean;
  format?: 'number' | 'percentage' | 'compact' | 'currency';
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  isLoading = false,
  format = 'number',
  className = '',
}: MetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'compact':
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toLocaleString();
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const TrendIcon = getTrendIcon();

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-900">{formatValue(value)}</p>
      </div>

      <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
        <TrendIcon className="w-4 h-4" />
        <span className="font-medium">
          {change > 0 ? '+' : ''}
          {change.toFixed(1)}%
        </span>
        <span className="text-gray-500 ml-1">vs prev period</span>
      </div>
    </div>
  );
}
```

```typescript
// src/components/analytics/DateRangePicker.tsx
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DayPicker, DateRange as DayPickerDateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: string;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
  compareMode: boolean;
  onCompareModeChange: (enabled: boolean) => void;
}

const PRESETS = [
  { id: 'last7Days', label: 'Last 7 days', getValue: () => ({ startDate: subDays(new Date(), 7), endDate: new Date() }) },
  { id: 'last30Days', label: 'Last 30 days', getValue: () => ({ startDate: subDays(new Date(), 30), endDate: new Date() }) },
  { id: 'last90Days', label: 'Last 90 days', getValue: () => ({ startDate: subDays(new Date(), 90), endDate: new Date() }) },
  { id: 'thisMonth', label: 'This month', getValue: () => ({ startDate: startOfMonth(new Date()), endDate: new Date() }) },
  { id: 'lastMonth', label: 'Last month', getValue: () => {
    const last = subMonths(new Date(), 1);
    return { startDate: startOfMonth(last), endDate: endOfMonth(last) };
  }},
];

export function DateRangePicker({ dateRange, onChange, compareMode, onCompareModeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DayPickerDateRange | undefined>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    const range = preset.getValue();
    onChange({ ...range, preset: preset.id });
    setIsOpen(false);
  };

  const handleCustomRangeApply = () => {
    if (customRange?.from && customRange?.to) {
      onChange({
        startDate: customRange.from,
        endDate: customRange.to,
        preset: 'custom',
      });
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {format(dateRange.startDate, 'MMM dd')} - {format(dateRange.endDate, 'MMM dd, yyyy')}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20 min-w-[350px]">
          {/* Presets */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Select</h4>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    dateRange.preset === preset.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="border-t border-gray-200 pt-4 mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Custom Range</h4>
            <DayPicker
              mode="range"
              selected={customRange}
              onSelect={setCustomRange}
              numberOfMonths={1}
              disabled={{ after: new Date() }}
            />
          </div>

          {/* Compare mode toggle */}
          <div className="border-t border-gray-200 pt-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => onCompareModeChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Compare to previous period</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCustomRangeApply}
              disabled={!customRange?.from || !customRange?.to}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

```typescript
// src/services/analyticsService.ts
import { apiClient } from '@/lib/apiClient';

export interface AnalyticsParams {
  startDate: string;
  endDate: string;
  accountId?: string;
}

export const analyticsService = {
  async getAnalytics(params: AnalyticsParams) {
    const response = await apiClient.get('/analytics', { params });
    return response.data;
  },

  async exportToPDF(data: any): Promise<Blob> {
    const response = await apiClient.post('/analytics/export/pdf', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportToCSV(data: any): Promise<Blob> {
    const response = await apiClient.post('/analytics/export/csv', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportToExcel(data: any): Promise<Blob> {
    const response = await apiClient.post('/analytics/export/excel', data, {
      responseType: 'blob',
    });
    return response.data;
  },
};
```

## Testing Requirements

### Unit Tests
- Test MetricCard component with different formats
- Test DateRangePicker preset selection and custom range
- Test data formatting functions
- Test chart data transformations
- Test export functionality

### Integration Tests
- Test analytics data fetching and display
- Test date range changes trigger data refetch
- Test compare mode functionality
- Test chart interactions
- Test export with different formats

### E2E Tests
- Complete analytics dashboard flow
- Date range selection and data update
- Export analytics to PDF/CSV
- Auto-refresh functionality
- Responsive behavior on different devices

## Dependencies
```json
{
  "recharts": "^2.10.0",
  "react-day-picker": "^8.10.0",
  "date-fns": "^3.0.0",
  "@tanstack/react-query": "^5.0.0",
  "react-hot-toast": "^2.4.1",
  "lucide-react": "^0.300.0"
}
```

## Definition of Done
- [ ] All 22 acceptance criteria implemented and tested
- [ ] All chart types working with real data
- [ ] Export functionality (PDF, CSV, Excel) working
- [ ] Date range picker with presets and custom range
- [ ] Compare mode showing previous period data
- [ ] Auto-refresh functionality implemented
- [ ] Responsive design tested on mobile, tablet, desktop
- [ ] Loading states and error handling
- [ ] Accessibility compliance (WCAG AA)
- [ ] Unit tests with >80% coverage
- [ ] Integration tests passing
- [ ] E2E tests covering main flows
- [ ] Performance optimization (lazy loading, memoization)
- [ ] Code review completed
- [ ] Documentation updated

## Notes
- Use Recharts for all chart visualizations
- Implement proper error boundaries for each chart
- Cache analytics data for 5 minutes
- Debounce filter changes to prevent excessive API calls
- Optimize chart rendering for large datasets
- Consider implementing virtual scrolling for long tables
- Add proper TypeScript types for all analytics data structures
