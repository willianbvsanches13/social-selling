'use client';

import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Insight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: string;
}

interface InsightsPanelProps {
  insights: Insight[];
  className?: string;
}

export function InsightsPanel({ insights, className = '' }: InsightsPanelProps) {
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return TrendingUp;
      case 'negative':
        return TrendingDown;
      case 'neutral':
        return Info;
      default:
        return AlertCircle;
    }
  };

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'negative':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'neutral':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'neutral':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
      <div className="space-y-3">
        {insights.map((insight, index) => {
          const Icon = getInsightIcon(insight.type);
          return (
            <div
              key={index}
              className={cn(
                'p-4 rounded-lg border',
                getInsightColor(insight.type)
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', getIconColor(insight.type))} />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{insight.title}</h4>
                  <p className="text-sm opacity-90">{insight.description}</p>
                  {insight.metric && (
                    <p className="text-sm font-semibold mt-2">{insight.metric}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
