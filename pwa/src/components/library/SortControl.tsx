/**
 * Sort Control Component
 *
 * Dropdown for selecting sort field and direction.
 *
 * Requirements: 3.4
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowsUpDownIcon, CheckIcon } from '../icons';
import type { RecipeSort, RecipeSortOption, SortDirection } from '../../types/search';

/**
 * Props for SortControl component
 */
export interface SortControlProps {
  value: RecipeSort;
  onChange: (sort: RecipeSort) => void;
}

/**
 * Sort options configuration
 */
const SORT_OPTIONS: { field: RecipeSortOption; label: string; defaultDir: SortDirection }[] = [
  { field: 'name', label: 'Name', defaultDir: 'asc' },
  { field: 'rating', label: 'Rating', defaultDir: 'desc' },
  { field: 'date_added', label: 'Date Added', defaultDir: 'desc' },
  { field: 'last_cooked', label: 'Last Cooked', defaultDir: 'desc' },
  { field: 'cook_time', label: 'Cook Time', defaultDir: 'asc' },
];

/**
 * Sort Control Component
 */
export function SortControl({ value, onChange }: SortControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle sort option selection
  const handleSelect = useCallback(
    (field: RecipeSortOption) => {
      const option = SORT_OPTIONS.find((o) => o.field === field);
      if (!option) return;

      // If same field, toggle direction; otherwise use default direction
      if (field === value.field) {
        onChange({
          field,
          direction: value.direction === 'asc' ? 'desc' : 'asc',
        });
      } else {
        onChange({
          field,
          direction: option.defaultDir,
        });
      }
      setIsOpen(false);
    },
    [value, onChange]
  );

  // Get current sort label
  const currentLabel = SORT_OPTIONS.find((o) => o.field === value.field)?.label || 'Sort';

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-label={`Sort by ${currentLabel}, ${value.direction === 'asc' ? 'ascending' : 'descending'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <ArrowsUpDownIcon className="w-5 h-5" />
        <span className="text-sm hidden sm:inline">{currentLabel}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
          {value.direction === 'asc' ? '↑' : '↓'}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20"
          role="listbox"
          aria-label="Sort options"
        >
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.field === value.field;
            return (
              <button
                key={option.field}
                onClick={() => handleSelect(option.field)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                  isSelected
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <span className="flex items-center gap-1">
                    <span className="text-xs">
                      {value.direction === 'asc' ? '↑' : '↓'}
                    </span>
                    <CheckIcon className="w-4 h-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
