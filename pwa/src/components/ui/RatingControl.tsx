/**
 * Rating Control Component
 *
 * Interactive 5-star rating control with immediate save and history display.
 *
 * Requirements: 8.1, 8.2, 8.3
 */

import { useState, useCallback, useMemo } from 'react';
import { StarIcon } from '../icons';

/**
 * Rating history entry
 */
export interface RatingEntry {
  rating: number;
  timestamp: Date;
}

/**
 * Props for RatingControl
 */
export interface RatingControlProps {
  /** Recipe ID */
  recipeId: string;
  /** Current rating (1-5, undefined if not rated) */
  currentRating?: number;
  /** Callback when rating changes */
  onChange: (rating: number) => void;
  /** Whether to show rating history */
  showHistory?: boolean;
  /** Rating history entries */
  ratingHistory?: RatingEntry[];
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the control is read-only */
  readOnly?: boolean;
  /** Optional class name */
  className?: string;
}

/**
 * Star sizes for each variant
 */
const STAR_SIZES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

/**
 * Gap sizes for each variant
 */
const GAP_SIZES = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1.5',
};

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Rating Control Component
 */
export function RatingControl({
  recipeId: _recipeId,
  currentRating,
  onChange,
  showHistory = false,
  ratingHistory = [],
  size = 'md',
  readOnly = false,
  className = '',
}: RatingControlProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const starSize = STAR_SIZES[size];
  const gapSize = GAP_SIZES[size];

  // Determine which rating to display (hover takes precedence)
  const displayRating = hoverRating ?? currentRating ?? 0;

  const handleStarClick = useCallback(
    (star: number) => {
      if (readOnly) return;
      onChange(star);
    },
    [onChange, readOnly]
  );

  const handleStarHover = useCallback(
    (star: number) => {
      if (readOnly) return;
      setHoverRating(star);
    },
    [readOnly]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverRating(null);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, star: number) => {
      if (readOnly) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onChange(star);
      }
    },
    [onChange, readOnly]
  );

  // Sort history by date (most recent first)
  const sortedHistory = useMemo(() => {
    return [...ratingHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [ratingHistory]);

  return (
    <div className={className}>
      {/* Star rating */}
      <div
        className={`flex items-center ${gapSize}`}
        onMouseLeave={handleMouseLeave}
        role="group"
        aria-label={`Rating: ${currentRating ?? 'Not rated'} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => handleStarHover(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            disabled={readOnly}
            className={`transition-transform ${
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded`}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            aria-pressed={currentRating === star}
          >
            <StarIcon
              className={`${starSize} transition-colors ${
                star <= displayRating
                  ? 'text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
              filled={star <= displayRating}
            />
          </button>
        ))}

        {/* History toggle button */}
        {showHistory && ratingHistory.length > 0 && (
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="ml-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
            aria-expanded={historyOpen}
            aria-controls="rating-history"
          >
            {historyOpen ? 'Hide history' : 'Show history'}
          </button>
        )}
      </div>

      {/* Rating history */}
      {showHistory && historyOpen && sortedHistory.length > 0 && (
        <div
          id="rating-history"
          className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
        >
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rating History
          </h4>
          <ul className="space-y-2">
            {sortedHistory.map((entry, index) => (
              <li
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                      key={star}
                      className={`w-3 h-3 ${
                        star <= entry.rating
                          ? 'text-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                      filled={star <= entry.rating}
                    />
                  ))}
                </div>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatDate(entry.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Display-only star rating (no interaction)
 */
export function StarRating({
  rating,
  size = 'sm',
  className = '',
}: {
  rating?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const starSize = STAR_SIZES[size];
  const gapSize = GAP_SIZES[size];

  return (
    <div
      className={`flex items-center ${gapSize} ${className}`}
      aria-label={rating ? `${rating} out of 5 stars` : 'Not rated'}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`${starSize} ${
            rating && star <= rating
              ? 'text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
          filled={rating !== undefined && star <= rating}
        />
      ))}
    </div>
  );
}
