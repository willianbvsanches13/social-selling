'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface Demographics {
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
}

interface DemographicsTableProps {
  demographics?: Demographics;
  isLoading?: boolean;
  className?: string;
}

export function DemographicsTable({ demographics, isLoading = false, className = '' }: DemographicsTableProps) {
  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!demographics) {
    return (
      <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audience Demographics</h3>
        <p className="text-gray-600 text-center py-8">No demographic data available</p>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Audience Demographics</h3>

      {/* Age Groups */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Age Distribution</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Age Range
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Count
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {demographics.ageGroups.map((group, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 text-sm text-gray-900">{group.range}</td>
                  <td className="py-3 text-sm text-gray-600 text-right">
                    {group.count.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-gray-600 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex-1 max-w-[100px] h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${group.percentage}%` }}
                        ></div>
                      </div>
                      <span>{group.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gender Distribution */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Gender Distribution</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Gender
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Count
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {demographics.gender.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 text-sm text-gray-900 capitalize">{item.type}</td>
                  <td className="py-3 text-sm text-gray-600 text-right">
                    {item.count.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-gray-600 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex-1 max-w-[100px] h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            item.type.toLowerCase() === 'male' ? 'bg-blue-500' :
                            item.type.toLowerCase() === 'female' ? 'bg-pink-500' :
                            'bg-purple-500'
                          )}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span>{item.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
