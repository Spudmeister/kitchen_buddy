/**
 * Search Input Component
 *
 * Real-time search input with debouncing.
 *
 * Requirements: 3.2, 32.1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchIcon, XMarkIcon } from '../icons';
import { SKIP_LINK_TARGETS } from '../../utils/accessibility';

/**
 * Props for SearchInput component
 */
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
  className?: string;
  /** Accessible label for the search input */
  ariaLabel?: string;
  /** ID for skip link targeting */
  id?: string;
}

/**
 * Search Input Component
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  autoFocus = false,
  className = '',
  ariaLabel = 'Search recipes',
  id = SKIP_LINK_TARGETS.SEARCH,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Clear search
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && localValue) {
      e.preventDefault();
      handleClear();
    }
  }, [localValue, handleClear]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`} role="search">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
      </div>
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        aria-label={ariaLabel}
        aria-describedby={localValue ? 'search-clear-hint' : undefined}
      />
      {localValue && (
        <>
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:text-gray-600 dark:focus:text-gray-300"
            aria-label="Clear search"
            type="button"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
          <span id="search-clear-hint" className="sr-only">
            Press Escape to clear search
          </span>
        </>
      )}
    </div>
  );
}
