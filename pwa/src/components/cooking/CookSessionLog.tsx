/**
 * Cook Session Log Component
 *
 * Allows users to log a cook session with actual times, servings, and notes.
 * Can be triggered after Cook Mode ends or from Recipe Detail.
 *
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 */

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLogCookSession } from '../../hooks/useCookSessions';
import { useUIStore } from '../../stores/ui-store';
import {
  XMarkIcon,
  CheckIcon,
} from '../icons';
import type { Recipe } from '../../types/recipe';
import type { InstanceConfig } from '../../types/instance';

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Props for CookSessionLog component
 */
export interface CookSessionLogProps {
  /** Recipe that was cooked */
  recipe: Recipe;
  /** Configuration used during cooking (from Cook Mode or pre-cook config) */
  config?: InstanceConfig;
  /** Callback when session is logged successfully */
  onComplete: () => void;
  /** Callback when modal is closed without logging */
  onClose: () => void;
  /** Whether this is prompted after Cook Mode (vs manual logging) */
  isPostCookMode?: boolean;
}

/**
 * Time input component with increment/decrement buttons
 */
function TimeInput({
  label,
  value,
  onChange,
  placeholder,
  estimatedTime,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  estimatedTime?: number;
}) {
  const handleIncrement = () => {
    onChange((value ?? estimatedTime ?? 0) + 5);
  };

  const handleDecrement = () => {
    const current = value ?? estimatedTime ?? 0;
    if (current >= 5) {
      onChange(current - 5);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(undefined);
    } else {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0) {
        onChange(num);
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {estimatedTime !== undefined && (
          <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
            (estimated: {formatDuration(estimatedTime)})
          </span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Decrease time"
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            value={value ?? ''}
            onChange={handleInputChange}
            placeholder={placeholder ?? (estimatedTime !== undefined ? String(estimatedTime) : '0')}
            className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
            min
          </span>
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Increase time"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Servings input component
 */
function ServingsInput({
  value,
  onChange,
  baseServings,
}: {
  value: number;
  onChange: (value: number) => void;
  baseServings: number;
}) {
  const handleIncrement = () => {
    onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value > 1) {
      onChange(value - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= 1) {
      onChange(num);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Servings made
        <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
          (recipe: {baseServings})
        </span>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= 1}
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Decrease servings"
        >
          −
        </button>
        <input
          type="number"
          min="1"
          value={value}
          onChange={handleInputChange}
          className="flex-1 px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Increase servings"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Cook Session Log Modal
 */
export function CookSessionLog({
  recipe,
  config,
  onComplete,
  onClose,
  isPostCookMode = false,
}: CookSessionLogProps) {
  const showToast = useUIStore((state) => state.showToast);
  const logCookSession = useLogCookSession();

  // Form state
  const [prepMinutes, setPrepMinutes] = useState<number | undefined>(undefined);
  const [cookMinutes, setCookMinutes] = useState<number | undefined>(undefined);
  const [servingsMade, setServingsMade] = useState(
    config?.servings ?? recipe.servings
  );
  const [notes, setNotes] = useState(config?.notes ?? '');

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await logCookSession.mutateAsync({
        recipeId: recipe.id,
        date: new Date(),
        actualPrepMinutes: prepMinutes,
        actualCookMinutes: cookMinutes,
        servingsMade,
        notes: notes.trim() || undefined,
      });

      showToast({
        type: 'success',
        message: 'Cook session logged!',
      });

      onComplete();
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to log cook session',
      });
    }
  }, [recipe.id, prepMinutes, cookMinutes, servingsMade, notes, logCookSession, showToast, onComplete]);

  // Handle skip (close without logging)
  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && handleSkip()}
      role="dialog"
      aria-modal="true"
      aria-label="Log cook session"
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isPostCookMode ? 'How did it go?' : 'Log a Cook'}
          </h2>
          <button
            onClick={handleSkip}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Recipe info */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
              <span className="text-xl">🍽️</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {recipe.title}
              </h3>
              {config && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {config.scaleFactor && config.scaleFactor !== 1
                    ? `${config.scaleFactor}x scale • `
                    : ''}
                  {config.unitSystem === 'metric' ? 'Metric' : 'US'} units
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Prep time */}
            <TimeInput
              label="Actual prep time"
              value={prepMinutes}
              onChange={setPrepMinutes}
              estimatedTime={recipe.prepTime.minutes}
            />

            {/* Cook time */}
            <TimeInput
              label="Actual cook time"
              value={cookMinutes}
              onChange={setCookMinutes}
              estimatedTime={recipe.cookTime.minutes}
            />

            {/* Servings */}
            <ServingsInput
              value={servingsMade}
              onChange={setServingsMade}
              baseServings={recipe.servings}
            />

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it turn out? Any modifications?"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-3">
            <button
              type="submit"
              disabled={logCookSession.isPending}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {logCookSession.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Log Session
                </>
              )}
            </button>
            {isPostCookMode && (
              <button
                type="button"
                onClick={handleSkip}
                className="w-full px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
              >
                Skip for now
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CookSessionLog;
