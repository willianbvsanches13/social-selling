'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { AnalyticsDateRange } from '@/types/analytics';
import { cn } from '@/lib/utils/cn';

interface DateRangeSelectorProps {
  value: AnalyticsDateRange;
  onChange: (dateRange: AnalyticsDateRange) => void;
}

const PRESET_RANGES = [
  { label: 'Today', value: 'today', days: 0 },
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
] as const;

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const handlePresetChange = (days: number, period: '7d' | '30d' | '90d' | 'today') => {
    const end = new Date();
    const start = days === 0 ? new Date() : new Date(new Date().setDate(new Date().getDate() - days));

    onChange({
      start,
      end,
      period,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-5 w-5 text-gray-400" />

      <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
        {PRESET_RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => handlePresetChange(range.days, range.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              value.period === range.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
