'use client';

import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { analyticsService } from '@/lib/services/analytics.service';
import { AnalyticsDateRange } from '@/types/analytics';
import { cn } from '@/lib/utils/cn';

interface ExportButtonProps {
  accountId: string;
  dateRange: AnalyticsDateRange;
}

export function ExportButton({ accountId, dateRange }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);
      setExportSuccess(false);

      const blob = await analyticsService.exportData(accountId, dateRange, format);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => handleExport('csv')}
        disabled={isExporting || !accountId}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
          exportSuccess
            ? 'border-green-600 bg-green-50 text-green-700'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
          (isExporting || !accountId) && 'cursor-not-allowed opacity-50'
        )}
        data-testid="export-button"
      >
        {exportSuccess ? (
          <>
            <Check className="h-4 w-4" />
            Exported
          </>
        ) : isExporting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export CSV
          </>
        )}
      </button>
    </div>
  );
}
