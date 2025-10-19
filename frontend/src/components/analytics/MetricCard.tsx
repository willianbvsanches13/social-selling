'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

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
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
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
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2',
        className
      )}
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

      <div className={cn('flex items-center gap-1 text-sm', getTrendColor())}>
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
