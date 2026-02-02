/**
 * Unit Toggle Component
 *
 * Segmented control for switching between US and Metric unit systems.
 * - Persists preference to localStorage via UI store
 * - Applies default from user preferences
 *
 * Requirements: 5.3, 5.5
 */

import { useCallback } from 'react';
import type { UnitSystem } from '../../types/units';

/**
 * Unit Toggle props
 */
export interface UnitToggleProps {
  /** Current unit system */
  currentSystem: UnitSystem;
  /** Callback when unit system changes */
  onChange: (system: UnitSystem) => void;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Unit Toggle Component
 */
export function UnitToggle({
  currentSystem,
  onChange,
  className = '',
  size = 'md',
}: UnitToggleProps) {
  const handleUSClick = useCallback(() => {
    if (currentSystem !== 'us') {
      onChange('us');
    }
  }, [currentSystem, onChange]);

  const handleMetricClick = useCallback(() => {
    if (currentSystem !== 'metric') {
      onChange('metric');
    }
  }, [currentSystem, onChange]);

  // Size-based classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const buttonSize = sizeClasses[size];

  return (
    <div
      className={`inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 ${className}`}
      role="radiogroup"
      aria-label="Unit system"
    >
      <button
        type="button"
        role="radio"
        aria-checked={currentSystem === 'us'}
        onClick={handleUSClick}
        className={`${buttonSize} font-medium rounded-md transition-all ${
          currentSystem === 'us'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        US
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={currentSystem === 'metric'}
        onClick={handleMetricClick}
        className={`${buttonSize} font-medium rounded-md transition-all ${
          currentSystem === 'metric'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        Metric
      </button>
    </div>
  );
}
