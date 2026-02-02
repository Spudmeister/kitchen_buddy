/**
 * Recipe Meta Component
 *
 * Displays aggregated statistics and feedback for a recipe:
 * - Cook statistics (times cooked, avg/min/max times)
 * - Rating history over time
 * - Estimated vs actual time comparison
 *
 * Requirements: 4.4
 */

import { useMemo } from 'react';
import type { Duration } from '../../types/units';
import {
  ChartBarIcon,
  ClockIcon,
  StarIcon,
} from '../icons';

/**
 * Cook statistics for a recipe
 */
export interface CookStats {
  /** Number of times the recipe has been cooked */
  timesCooked: number;
  /** Date of the last cook session */
  lastCooked?: Date;
  /** Average prep time across all sessions */
  avgPrepTime?: Duration;
  /** Average cook time across all sessions */
  avgCookTime?: Duration;
  /** Minimum prep time recorded */
  minPrepTime?: Duration;
  /** Maximum prep time recorded */
  maxPrepTime?: Duration;
  /** Minimum cook time recorded */
  minCookTime?: Duration;
  /** Maximum cook time recorded */
  maxCookTime?: Duration;
}

/**
 * A recorded rating entry
 */
export interface RatingEntry {
  /** Unique identifier */
  id: string;
  /** Recipe ID that was rated */
  recipeId: string;
  /** Rating value (1-5) */
  rating: number;
  /** When the rating was recorded */
  ratedAt: Date;
}

/**
 * Props for RecipeMeta component
 */
export interface RecipeMetaProps {
  /** Recipe ID */
  recipeId: string;
  /** Cook statistics */
  stats: CookStats;
  /** Rating history */
  ratingHistory?: RatingEntry[];
  /** Estimated prep time from recipe */
  estimatedPrepTime?: Duration;
  /** Estimated cook time from recipe */
  estimatedCookTime?: Duration;
  /** Optional class name */
  className?: string;
}

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(duration: Duration): string {
  const minutes = duration.minutes;
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format a date to relative or absolute string
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}

/**
 * Format date for rating history
 */
function formatRatingDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculate time difference percentage
 */
function calculateTimeDiff(estimated: Duration, actual: Duration): { diff: number; label: string } {
  const estMinutes = estimated.minutes;
  const actMinutes = actual.minutes;
  
  if (estMinutes === 0) return { diff: 0, label: 'N/A' };
  
  const diffPercent = ((actMinutes - estMinutes) / estMinutes) * 100;
  
  if (Math.abs(diffPercent) < 5) {
    return { diff: 0, label: 'On target' };
  } else if (diffPercent > 0) {
    return { diff: diffPercent, label: `+${Math.round(diffPercent)}% longer` };
  } else {
    return { diff: diffPercent, label: `${Math.round(diffPercent)}% faster` };
  }
}

/**
 * Star Rating Display Component
 */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <StarIcon
        key={i}
        className={`${sizeClass} ${
          i <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
        }`}
        filled={i <= rating}
      />
    );
  }

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {stars}
    </div>
  );
}

/**
 * Time Comparison Component
 */
function TimeComparison({
  label,
  estimated,
  actual,
}: {
  label: string;
  estimated?: Duration;
  actual?: Duration;
}) {
  if (!estimated || !actual) return null;

  const { diff, label: diffLabel } = calculateTimeDiff(estimated, actual);

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDuration(actual)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            vs {formatDuration(estimated)} est.
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            diff === 0
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : diff > 0
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}
        >
          {diffLabel}
        </span>
      </div>
    </div>
  );
}

/**
 * Rating History Component
 */
function RatingHistorySection({ history }: { history: RatingEntry[] }) {
  // Sort by date, most recent first
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => b.ratedAt.getTime() - a.ratedAt.getTime());
  }, [history]);

  if (sortedHistory.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No rating history yet
      </p>
    );
  }

  // Calculate rating trend
  const latestRating = sortedHistory[0]?.rating || 0;
  const oldestRating = sortedHistory[sortedHistory.length - 1]?.rating || 0;
  const trend = latestRating - oldestRating;

  return (
    <div>
      {/* Trend indicator */}
      {sortedHistory.length > 1 && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">Rating trend</span>
          <span
            className={`text-sm font-medium ${
              trend > 0
                ? 'text-green-600 dark:text-green-400'
                : trend < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {trend > 0 ? `↑ +${trend}` : trend < 0 ? `↓ ${trend}` : '→ No change'}
          </span>
        </div>
      )}

      {/* History list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {sortedHistory.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-1"
          >
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatRatingDate(entry.ratedAt)}
            </span>
            <StarRating rating={entry.rating} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Recipe Meta Component
 * 
 * Displays comprehensive statistics and feedback for a recipe
 */
export function RecipeMeta({
  recipeId: _recipeId,
  stats,
  ratingHistory = [],
  estimatedPrepTime,
  estimatedCookTime,
  className = '',
}: RecipeMetaProps) {
  const hasTimeData = stats.avgPrepTime || stats.avgCookTime;
  const hasRatingHistory = ratingHistory.length > 0;

  if (stats.timesCooked === 0 && !hasRatingHistory) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <ChartBarIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No statistics yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Cook this recipe to start tracking
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cook Statistics Section */}
      {stats.timesCooked > 0 && (
        <section
          className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
          aria-labelledby="cook-stats-heading"
        >
          <h3
            id="cook-stats-heading"
            className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4"
          >
            <ChartBarIcon className="w-5 h-5" />
            Cook Statistics
          </h3>

          {/* Basic stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Times Cooked</dt>
              <dd className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.timesCooked}
              </dd>
            </div>
            {stats.lastCooked && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Last Cooked</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDate(stats.lastCooked)}
                </dd>
              </div>
            )}
          </div>

          {/* Time statistics */}
          {hasTimeData && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <ClockIcon className="w-4 h-4" />
                Time Statistics
              </h4>

              <div className="grid grid-cols-2 gap-4">
                {stats.avgPrepTime && (
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Avg Prep</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDuration(stats.avgPrepTime)}
                    </dd>
                    {stats.minPrepTime && stats.maxPrepTime && (
                      <dd className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDuration(stats.minPrepTime)} - {formatDuration(stats.maxPrepTime)}
                      </dd>
                    )}
                  </div>
                )}
                {stats.avgCookTime && (
                  <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400">Avg Cook</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDuration(stats.avgCookTime)}
                    </dd>
                    {stats.minCookTime && stats.maxCookTime && (
                      <dd className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDuration(stats.minCookTime)} - {formatDuration(stats.maxCookTime)}
                      </dd>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Estimated vs Actual comparison */}
          {(estimatedPrepTime || estimatedCookTime) && hasTimeData && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Estimated vs Actual
              </h4>
              <div>
                <TimeComparison
                  label="Prep Time"
                  estimated={estimatedPrepTime}
                  actual={stats.avgPrepTime}
                />
                <TimeComparison
                  label="Cook Time"
                  estimated={estimatedCookTime}
                  actual={stats.avgCookTime}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Rating History Section */}
      {hasRatingHistory && (
        <section
          className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
          aria-labelledby="rating-history-heading"
        >
          <h3
            id="rating-history-heading"
            className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4"
          >
            <StarIcon className="w-5 h-5" filled />
            Rating History
          </h3>
          <RatingHistorySection history={ratingHistory} />
        </section>
      )}
    </div>
  );
}
