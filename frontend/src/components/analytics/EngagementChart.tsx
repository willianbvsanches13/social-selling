'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { EngagementDataPoint } from '@/types/analytics';

interface EngagementChartProps {
  data: EngagementDataPoint[];
  isLoading?: boolean;
}

export function EngagementChart({ data, isLoading = false }: EngagementChartProps) {
  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <p className="text-sm text-gray-500">No engagement data available for this period</p>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((point) => ({
    ...point,
    date: format(new Date(point.date), 'MMM dd'),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={{ stroke: '#e5e7eb' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
          }}
          formatter={(value: number) => value.toLocaleString()}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
        />
        <Area
          type="monotone"
          dataKey="engagement"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.6}
          name="Engagement"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="reach"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.4}
          name="Reach"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="impressions"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.2}
          name="Impressions"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
