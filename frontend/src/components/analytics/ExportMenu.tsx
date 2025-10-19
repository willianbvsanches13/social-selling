'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, File, Table } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ExportMenuProps {
  onExport: (format: 'pdf' | 'csv' | 'excel') => Promise<void>;
  isExporting: boolean;
  className?: string;
}

export function ExportMenu({ onExport, isExporting, className = '' }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    await onExport(format);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
      </button>

      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 min-w-[180px]">
          <button
            onClick={() => handleExport('pdf')}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4 text-gray-500" />
            <span>Export as PDF</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <File className="w-4 h-4 text-gray-500" />
            <span>Export as CSV</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Table className="w-4 h-4 text-gray-500" />
            <span>Export as Excel</span>
          </button>
        </div>
      )}
    </div>
  );
}
