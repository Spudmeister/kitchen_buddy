/**
 * Scale Control Component
 *
 * Allows users to adjust recipe servings with:
 * - Stepper with +/- buttons
 * - Direct input of servings
 * - Display of scale factor (e.g., "2x")
 *
 * Requirements: 5.1, 5.2
 */

import { useCallback, useState, useEffect } from 'react';

/**
 * Scale Control props
 */
export interface ScaleControlProps {
  /** Base servings from the original recipe */
  baseServings: number;
  /** Current servings value */
  currentServings: number;
  /** Callback when servings change */
  onChange: (servings: number) => void;
  /** Minimum allowed servings */
  min?: number;
  /** Maximum allowed servings */
  max?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format scale factor for display
 */
function formatScaleFactor(baseServings: number, currentServings: number): string {
  if (baseServings === 0) return '1x';
  const factor = currentServings / baseServings;
  
  // Show as fraction for common values
  if (factor === 0.5) return '½x';
  if (factor === 0.25) return '¼x';
  if (factor === 0.75) return '¾x';
  if (factor === 1.5) return '1½x';
  
  // Show as decimal for other values
  if (Number.isInteger(factor)) {
    return `${factor}x`;
  }
  return `${factor.toFixed(1)}x`;
}

/**
 * Scale Control Component
 */
export function ScaleControl({
  baseServings,
  currentServings,
  onChange,
  min = 1,
  max = 100,
  className = '',
}: ScaleControlProps) {
  const [inputValue, setInputValue] = useState(currentServings.toString());
  const [isEditing, setIsEditing] = useState(false);

  // Sync input value when currentServings changes externally
  useEffect(() => {
    if (!isEditing) {
      setInputValue(currentServings.toString());
    }
  }, [currentServings, isEditing]);

  const scaleFactor = formatScaleFactor(baseServings, currentServings);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(min, currentServings - 1);
    onChange(newValue);
  }, [currentServings, min, onChange]);

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(max, currentServings + 1);
    onChange(newValue);
  }, [currentServings, max, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsEditing(false);
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    } else {
      // Reset to current value if invalid
      setInputValue(currentServings.toString());
    }
  }, [inputValue, min, max, onChange, currentServings]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setInputValue(currentServings.toString());
      (e.target as HTMLInputElement).blur();
    }
  }, [currentServings]);

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="group"
      aria-label="Servings control"
    >
      {/* Stepper controls */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={currentServings <= min}
          className="w-10 h-10 flex items-center justify-center rounded-l-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-200 dark:border-gray-700"
          aria-label="Decrease servings"
        >
          <MinusIcon className="w-5 h-5" />
        </button>
        
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="w-14 h-10 text-center font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
          aria-label="Servings"
        />
        
        <button
          type="button"
          onClick={handleIncrement}
          disabled={currentServings >= max}
          className="w-10 h-10 flex items-center justify-center rounded-r-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-200 dark:border-gray-700"
          aria-label="Increase servings"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Scale factor badge */}
      <span
        className="px-2 py-1 text-sm font-medium rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300"
        aria-label={`Scale factor: ${scaleFactor}`}
      >
        {scaleFactor}
      </span>

      {/* Servings label */}
      <span className="text-sm text-gray-600 dark:text-gray-400">
        servings
      </span>
    </div>
  );
}

/**
 * Minus Icon
 */
function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  );
}

/**
 * Plus Icon
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
