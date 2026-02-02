/**
 * Sue Suggestion Card Component
 *
 * Displays a recipe suggestion from Sue with:
 * - Recipe photo and title
 * - Sue's reason for suggesting
 * - Confidence indicator
 * - Accept/Reject/View actions
 *
 * Requirements: 16.3, 16.4
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RecipeSuggestion } from '@/types/sue';
import {
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  StarIcon,
} from '@components/icons';

/**
 * Props for SueSuggestionCard
 */
export interface SueSuggestionCardProps {
  suggestion: RecipeSuggestion;
  onAccept: () => void;
  onReject: () => void;
  onView?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Confidence indicator component
 */
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  
  let colorClass: string;
  let label: string;
  
  if (confidence >= 0.8) {
    colorClass = 'bg-green-500';
    label = 'High confidence';
  } else if (confidence >= 0.5) {
    colorClass = 'bg-yellow-500';
    label = 'Medium confidence';
  } else {
    colorClass = 'bg-gray-400';
    label = 'Low confidence';
  }

  return (
    <div
      className="flex items-center gap-1.5"
      title={`${percentage}% confidence`}
      aria-label={`${label}: ${percentage}%`}
    >
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {percentage}%
      </span>
    </div>
  );
}

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Sue Suggestion Card Component
 */
export function SueSuggestionCard({
  suggestion,
  onAccept,
  onReject,
  onView,
  disabled = false,
  className = '',
}: SueSuggestionCardProps) {
  const navigate = useNavigate();
  const { recipe, reason, confidence } = suggestion;

  const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;

  const handleView = useCallback(() => {
    if (onView) {
      onView();
    } else {
      navigate(`/recipe/${recipe.id}`);
    }
  }, [onView, navigate, recipe.id]);

  return (
    <article
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-sm
        border border-gray-200 dark:border-gray-700
        overflow-hidden
        ${className}
      `}
      aria-label={`Sue suggests: ${recipe.title}`}
    >
      {/* Recipe info */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div
            className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden cursor-pointer"
            onClick={handleView}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleView()}
            aria-label={`View ${recipe.title}`}
          >
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-2xl">🍽️</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4
              className="font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
              onClick={handleView}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleView()}
            >
              {recipe.title}
            </h4>

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                {formatDuration(totalTime)}
              </span>
              {recipe.rating && (
                <span className="flex items-center gap-1">
                  <StarIcon className="w-3.5 h-3.5 text-yellow-400" filled />
                  {recipe.rating}
                </span>
              )}
            </div>

            {/* Confidence */}
            <div className="mt-2">
              <ConfidenceIndicator confidence={confidence} />
            </div>
          </div>
        </div>

        {/* Sue's reason */}
        <div className="mt-3 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
          <p className="text-sm text-primary-700 dark:text-primary-300">
            <span className="font-medium">Sue says:</span> {reason}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onAccept}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3
            text-sm font-medium
            text-green-600 dark:text-green-400
            hover:bg-green-50 dark:hover:bg-green-900/20
            transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={`Accept ${recipe.title}`}
        >
          <CheckIcon className="w-4 h-4" />
          Accept
        </button>

        <div className="w-px bg-gray-200 dark:bg-gray-700" />

        <button
          onClick={onReject}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3
            text-sm font-medium
            text-red-600 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={`Reject ${recipe.title}`}
        >
          <XMarkIcon className="w-4 h-4" />
          Reject
        </button>

        <div className="w-px bg-gray-200 dark:bg-gray-700" />

        <button
          onClick={handleView}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3
            text-sm font-medium
            text-gray-600 dark:text-gray-400
            hover:bg-gray-50 dark:hover:bg-gray-700
            transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={`View ${recipe.title} details`}
        >
          <EyeIcon className="w-4 h-4" />
          View
        </button>
      </div>
    </article>
  );
}

/**
 * Compact suggestion card for inline display
 */
export function SueSuggestionCardCompact({
  suggestion,
  onAccept,
  onReject,
  onView,
  disabled = false,
  className = '',
}: SueSuggestionCardProps) {
  const navigate = useNavigate();
  const { recipe, reason } = suggestion;

  const handleView = useCallback(() => {
    if (onView) {
      onView();
    } else {
      navigate(`/recipe/${recipe.id}`);
    }
  }, [onView, navigate, recipe.id]);

  return (
    <div
      className={`
        flex items-center gap-3 p-3
        bg-white dark:bg-gray-800 rounded-lg
        border border-gray-200 dark:border-gray-700
        ${className}
      `}
    >
      {/* Thumbnail */}
      <div
        className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden cursor-pointer"
        onClick={handleView}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleView()}
      >
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <span className="text-lg">🍽️</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4
          className="font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-primary-600"
          onClick={handleView}
        >
          {recipe.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {reason}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onAccept}
          disabled={disabled}
          className="p-1.5 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
          aria-label="Accept"
        >
          <CheckIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onReject}
          disabled={disabled}
          className="p-1.5 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
          aria-label="Reject"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
