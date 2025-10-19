'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface ChartContainerProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ChartContainer({
  title,
  description,
  isLoading = false,
  children,
  className = '',
}: ChartContainerProps) {
  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          {description && <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>}
          <div className="h-[300px] bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}
