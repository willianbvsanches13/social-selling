'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { FollowerGrowthDataPoint } from '@/types/analytics';

interface FollowerGrowthChartProps {
  data: FollowerGrowthDataPoint[];
  isLoading?: boolean;
}

export function FollowerGrowthChart({ data, isLoading = false }: FollowerGrowthChartProps) {
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
        <p className="text-sm text-gray-500">No follower data available for this period</p>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((point) => ({
    ...point,
    date: format(new Date(point.date), 'MMM dd'),
    followers: point.followers,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
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
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="followers"
          stroke="#8b5cf6"
          strokeWidth={3}
          dot={{ fill: '#8b5cf6', r: 4 }}
          activeDot={{ r: 6 }}
          name="Followers"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
