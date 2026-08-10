import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface DatePickerPreset {
  label: string;
  getValue: () => string; // YYYY-MM-DD
}

export interface DatePickerProps {
  id?: string;
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  presets?: DatePickerPreset[];
  quickPresetType?: 'expiry' | 'manufacture' | 'prescription' | 'custom';
  position?: 'top' | 'bottom';
  align?: 'left' | 'right';
}

const DEFAULT_EXPIRY_PRESETS: DatePickerPreset[] = [
  {
    label: '+6 Mos',
    getValue: () => {
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      return d.toISOString().slice(0, 10);
    },
  },
  {
    label: '+1 Year',
    getValue: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().slice(0, 10);
    },
  },
  {
    label: '+2 Years',
    getValue: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      return d.toISOString().slice(0, 10);
    },
  },
  {
    label: '+3 Years',
    getValue: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 3);
      return d.toISOString().slice(0, 10);
    },
  },
];

const DEFAULT_MANUFACTURE_PRESETS: DatePickerPreset[] = [
  {
    label: 'Today',
    getValue: () => new Date().toISOString().slice(0, 10),
  },
  {
    label: '-6 Mos',
    getValue: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return d.toISOString().slice(0, 10);
    },
  },
  {
    label: '-1 Year',
    getValue: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString().slice(0, 10);
    },
  },
];

const DEFAULT_PRESCRIPTION_PRESETS: DatePickerPreset[] = [
  {
    label: 'Today',
    getValue: () => new Date().toISOString().slice(0, 10),
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    },
  },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Select date...',
  label,
  required = false,
  min,
  max,
  disabled = false,
  className = '',
  size = 'md',
  presets,
  quickPresetType,
  position = 'top',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to current date view
  const initialDate = value ? new Date(value) : new Date();
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState<number>(validInitialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validInitialDate.getMonth());

  // Update calendar view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active presets
  let activePresets: DatePickerPreset[] = presets || [];
  if (!presets && quickPresetType) {
    if (quickPresetType === 'expiry') activePresets = DEFAULT_EXPIRY_PRESETS;
    else if (quickPresetType === 'manufacture') activePresets = DEFAULT_MANUFACTURE_PRESETS;
    else if (quickPresetType === 'prescription') activePresets = DEFAULT_PRESCRIPTION_PRESETS;
  }

  // Formatting date for display
  const formatDisplayDate = (val: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m, d);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    }
    return val;
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Days in current view month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateString = `${viewYear}-${formattedMonth}-${formattedDay}`;
    onChange(dateString);
    setIsOpen(false);
  };

  const handleSelectPreset = (preset: DatePickerPreset) => {
    const dateVal = preset.getValue();
    onChange(dateVal);
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Generate Year dropdown options (e.g. 2020 to 2040)
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear - 10; y <= currentYear + 15; y++) {
    yearOptions.push(y);
  }

  const isSmall = size === 'sm';

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {label && (
        <label className={`block font-semibold text-slate-700 mb-0.5 ${isSmall ? 'text-[11px]' : 'text-xs'}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Trigger Input */}
      <div className="relative flex items-center">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full text-left bg-white border rounded-lg transition-all flex items-center justify-between gap-2 shadow-2xs select-none ${
            isOpen 
              ? 'border-[#22577A] ring-2 ring-[#22577A]/15' 
              : 'border-slate-300 hover:border-slate-400'
          } ${disabled ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${
            isSmall ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <CalendarIcon className={`text-[#22577A] shrink-0 ${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            {value ? (
              <span className="font-semibold text-slate-800 text-xs truncate">
                {value} <span className="text-slate-400 font-normal text-[11px] ml-1">({formatDisplayDate(value)})</span>
              </span>
            ) : (
              <span className="text-slate-400 font-normal truncate">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {value && !required && !disabled && (
              <span 
                onClick={handleClear}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                title="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div 
          className={`absolute z-[100] w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 animate-in fade-in zoom-in-95 duration-100 ${
            position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Quick Presets Bar */}
          {activePresets.length > 0 && (
            <div className="mb-2.5 pb-2 border-b border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                QUICK SELECT
              </div>
              <div className="flex flex-wrap gap-1">
                {activePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="px-2 py-1 text-[11px] font-semibold text-[#22577A] bg-[#22577A]/10 hover:bg-[#22577A] hover:text-white rounded-md transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Month & Year Header Controls */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 focus:outline-hidden cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 focus:outline-hidden cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d, idx) => (
              <span key={idx} className="text-[11px] font-bold text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty offset cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-7" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const formattedMonth = String(viewMonth + 1).padStart(2, '0');
              const formattedDay = String(day).padStart(2, '0');
              const cellDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

              const isSelected = value === cellDateStr;
              const isToday = todayStr === cellDateStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 text-xs font-medium rounded-lg flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#22577A] text-white font-bold shadow-xs'
                      : isToday
                      ? 'border border-[#22577A] text-[#22577A] font-bold hover:bg-slate-100'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr);
                const d = new Date();
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
                setIsOpen(false);
              }}
              className="font-bold text-[#22577A] hover:underline"
            >
              Select Today
            </button>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
