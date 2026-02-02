/**
 * Create Menu Modal Component
 *
 * Modal for creating a new menu with date range selection.
 *
 * Requirements: 12.5
 */

import { useState, useCallback } from 'react';
import { XMarkIcon, CalendarIcon } from '../icons';

/**
 * Props for CreateMenuModal component
 */
export interface CreateMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, startDate: Date, endDate: Date) => void;
}

/**
 * Format date for input
 */
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

/**
 * Get default date range (current week)
 */
function getDefaultDateRange(): { start: Date; end: Date } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Start from Sunday of current week
  const start = new Date(today);
  start.setDate(today.getDate() - dayOfWeek);
  
  // End on Saturday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return { start, end };
}

/**
 * Create Menu Modal Component
 */
export function CreateMenuModal({
  isOpen,
  onClose,
  onCreate,
}: CreateMenuModalProps) {
  const defaultRange = getDefaultDateRange();
  
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(formatDateForInput(defaultRange.start));
  const [endDate, setEndDate] = useState(formatDateForInput(defaultRange.end));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        setError('Start date must be before end date');
        return;
      }

      const menuName = name.trim() || `Menu ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      onCreate(menuName, start, end);
      
      // Reset form
      setName('');
      setStartDate(formatDateForInput(defaultRange.start));
      setEndDate(formatDateForInput(defaultRange.end));
      onClose();
    },
    [name, startDate, endDate, onCreate, onClose, defaultRange]
  );

  const handleQuickSelect = useCallback((days: number) => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + days - 1);
    
    setStartDate(formatDateForInput(today));
    setEndDate(formatDateForInput(end));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <CalendarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Menu
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="menu-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Menu Name (optional)
            </label>
            <input
              id="menu-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Week of Jan 27"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Quick select buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Select
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(7)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                1 Week
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(14)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                2 Weeks
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(30)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                1 Month
              </button>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="start-date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label
                htmlFor="end-date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Create Menu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
