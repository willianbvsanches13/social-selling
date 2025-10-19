'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface OverviewCardProps {
  title: string;
  value: string;
  change: number;
  changeText: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

export function OverviewCard({
  title,
  value,
  change,
  changeText,
  icon: Icon,
  isLoading = false,
}: OverviewCardProps) {
  if (isLoading) {
    return (
      <div
        className="animate-pulse rounded-lg border border-gray-200 bg-white p-6"
        data-testid="metric-skeleton"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-8 w-32 rounded bg-gray-200" />
            <div className="h-4 w-20 rounded bg-gray-200" />
          </div>
          <div className="h-12 w-12 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
      data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <div className="mt-2 flex items-center gap-1">
            <TrendIcon
              className={cn(
                'h-4 w-4',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}
            />
            <span
              className={cn(
                'text-sm font-medium',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}
              data-testid={isPositive ? 'change-positive' : 'change-negative'}
            >
              {changeText}
            </span>
            <span className="text-sm text-gray-500">vs last period</span>
          </div>
        </div>

        <div
          className={cn(
            'rounded-lg p-3',
            isPositive ? 'bg-green-100' : 'bg-blue-100'
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              isPositive ? 'text-green-600' : 'text-blue-600'
            )}
          />
        </div>
      </div>
    </div>
  );
}
