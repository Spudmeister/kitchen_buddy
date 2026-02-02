/**
 * Recipe Card Component
 *
 * Universal recipe display unit that appears throughout the app.
 * Supports compact, standard, and detailed variants.
 *
 * Requirements: 4.5, 11.1, 32.1, 32.4
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../../types/recipe';
import {
  ClockIcon,
  StarIcon,
  EllipsisVerticalIcon,
} from '../icons';
import { QuickActionsMenu, type QuickActionType } from '../ui/QuickActionsMenu';

// Re-export QuickActionType for backwards compatibility
export type { QuickActionType } from '../ui/QuickActionsMenu';

/**
 * Recipe Card props
 */
export interface RecipeCardProps {
  recipe: Recipe;
  variant?: 'compact' | 'standard' | 'detailed';
  showQuickActions?: boolean;
  onTap?: () => void;
  onQuickAction?: (action: QuickActionType) => void;
  className?: string;
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
 * Get total time (prep + cook)
 */
function getTotalTime(recipe: Recipe): number {
  return recipe.prepTime.minutes + recipe.cookTime.minutes;
}

/**
 * Star Rating Display Component
 */
function StarRating({ rating, size = 'sm' }: { rating?: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <StarIcon
        key={i}
        className={`${sizeClass} ${
          rating && i <= rating
            ? 'text-yellow-400'
            : 'text-gray-300 dark:text-gray-600'
        }`}
        filled={rating !== undefined && i <= rating}
      />
    );
  }

  return (
    <div className="flex items-center gap-0.5" aria-label={rating ? `${rating} out of 5 stars` : 'Not rated'}>
      {stars}
    </div>
  );
}

/**
 * Recipe Card Component
 */
export function RecipeCard({
  recipe,
  variant = 'standard',
  showQuickActions = true,
  onTap,
  onQuickAction,
  className = '',
}: RecipeCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const totalTime = getTotalTime(recipe);

  const handleClick = useCallback(() => {
    if (onTap) {
      onTap();
    } else {
      navigate(`/recipe/${recipe.id}`);
    }
  }, [onTap, navigate, recipe.id]);

  const handleQuickAction = useCallback(
    (action: QuickActionType) => {
      if (onQuickAction) {
        onQuickAction(action);
      } else {
        // Default action handlers
        switch (action) {
          case 'cook-now':
            navigate(`/recipe/${recipe.id}/cook`);
            break;
          case 'edit':
            navigate(`/recipe/${recipe.id}/edit`);
            break;
          default:
            // Other actions would be handled by parent
            break;
        }
      }
    },
    [onQuickAction, navigate, recipe.id]
  );

  const handleLongPressStart = useCallback(() => {
    if (!showQuickActions) return;
    const timer = setTimeout(() => {
      setMenuOpen(true);
    }, 500);
    setLongPressTimer(timer);
  }, [showQuickActions]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  // Compact variant - minimal display for lists
  if (variant === 'compact') {
    return (
      <article
        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${className}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        role="button"
        tabIndex={0}
        aria-label={`${recipe.title}, ${totalTime} minutes total time${recipe.rating ? `, ${recipe.rating} stars` : ''}`}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-lg">🍽️</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{recipe.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatDuration(totalTime)}
            </span>
            {recipe.rating && (
              <span className="flex items-center gap-1">
                <StarIcon className="w-3 h-3 text-yellow-400" filled />
                {recipe.rating}
              </span>
            )}
          </div>
        </div>

        {/* Quick actions button */}
        {showQuickActions && (
          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              aria-label="Recipe actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
            </button>
            <QuickActionsMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              onAction={handleQuickAction}
              anchorRef={menuButtonRef}
              recipeTitle={recipe.title}
            />
          </div>
        )}
      </article>
    );
  }

  // Detailed variant - full information display
  if (variant === 'detailed') {
    return (
      <article
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow ${className}`}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        aria-label={`${recipe.title} recipe card`}
      >
        {/* Image */}
        <div
          className="aspect-video bg-gray-200 dark:bg-gray-700 cursor-pointer"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`View ${recipe.title} details`}
        >
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl">🍽️</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-semibold text-lg text-gray-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              role="button"
              tabIndex={0}
            >
              {recipe.title}
            </h3>
            {showQuickActions && (
              <div className="relative flex-shrink-0">
                <button
                  ref={menuButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Recipe actions"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                </button>
                <QuickActionsMenu
                  isOpen={menuOpen}
                  onClose={() => setMenuOpen(false)}
                  onAction={handleQuickAction}
                  anchorRef={menuButtonRef}
                  recipeTitle={recipe.title}
                />
              </div>
            )}
          </div>

          {recipe.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {recipe.description}
            </p>
          )}

          {/* Meta info */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              {formatDuration(totalTime)}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span>{recipe.servings} servings</span>
          </div>

          {/* Rating */}
          <div className="mt-2">
            <StarRating rating={recipe.rating} size="md" />
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {recipe.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
              {recipe.tags.length > 4 && (
                <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                  +{recipe.tags.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  // Standard variant (default) - balanced display
  return (
    <article
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow ${className}`}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      aria-label={`${recipe.title} recipe card`}
    >
      {/* Image */}
      <div
        className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 cursor-pointer"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`View ${recipe.title} details`}
      >
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <span className="text-3xl">🍽️</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 line-clamp-1"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
          >
            {recipe.title}
          </h3>
          {showQuickActions && (
            <div className="relative flex-shrink-0">
              <button
                ref={menuButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Recipe actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
              </button>
              <QuickActionsMenu
                isOpen={menuOpen}
                onClose={() => setMenuOpen(false)}
                onAction={handleQuickAction}
                anchorRef={menuButtonRef}
                recipeTitle={recipe.title}
              />
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="mt-2 flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-4 h-4" />
            {formatDuration(totalTime)}
          </span>
          <StarRating rating={recipe.rating} />
        </div>
      </div>
    </article>
  );
}
