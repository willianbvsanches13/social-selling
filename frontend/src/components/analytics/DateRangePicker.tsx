'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format as formatDate, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DayPicker, DateRange as DayPickerDateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: string;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
  compareMode: boolean;
  onCompareModeChange: (enabled: boolean) => void;
}

const PRESETS = [
  { id: 'last7Days', label: 'Last 7 days', getValue: () => ({ startDate: subDays(new Date(), 7), endDate: new Date() }) },
  { id: 'last30Days', label: 'Last 30 days', getValue: () => ({ startDate: subDays(new Date(), 30), endDate: new Date() }) },
  { id: 'last90Days', label: 'Last 90 days', getValue: () => ({ startDate: subDays(new Date(), 90), endDate: new Date() }) },
  { id: 'thisMonth', label: 'This month', getValue: () => ({ startDate: startOfMonth(new Date()), endDate: new Date() }) },
  { id: 'lastMonth', label: 'Last month', getValue: () => {
    const last = subMonths(new Date(), 1);
    return { startDate: startOfMonth(last), endDate: endOfMonth(last) };
  }},
];

export function DateRangePicker({ dateRange, onChange, compareMode, onCompareModeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DayPickerDateRange | undefined>();
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

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    const range = preset.getValue();
    onChange({ ...range, preset: preset.id });
    setIsOpen(false);
  };

  const handleCustomRangeApply = () => {
    if (customRange?.from && customRange?.to) {
      onChange({
        startDate: customRange.from,
        endDate: customRange.to,
        preset: 'custom',
      });
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {formatDate(dateRange.startDate, 'MMM dd')} - {formatDate(dateRange.endDate, 'MMM dd, yyyy')}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20 min-w-[350px]">
          {/* Presets */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Select</h4>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    dateRange.preset === preset.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="border-t border-gray-200 pt-4 mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Custom Range</h4>
            <DayPicker
              mode="range"
              selected={customRange}
              onSelect={setCustomRange}
              numberOfMonths={1}
              disabled={{ after: new Date() }}
            />
          </div>

          {/* Compare mode toggle */}
          <div className="border-t border-gray-200 pt-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => onCompareModeChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Compare to previous period</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCustomRangeApply}
              disabled={!customRange?.from || !customRange?.to}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
