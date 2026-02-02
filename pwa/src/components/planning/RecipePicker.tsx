/**
 * Recipe Picker Component
 *
 * Modal/panel for selecting a recipe to add to a menu slot.
 * Includes search and filtering capabilities.
 * Shows available leftovers as suggestions.
 *
 * Requirements: 13.2, 13.3, 17.3, 17.4
 */

import { useState, useCallback } from 'react';
import { useAdvancedRecipeSearch } from '@hooks/useRecipes';
import { useAvailableLeftovers, useCurrentMenu } from '@hooks/useMenus';
import { SearchInput } from '@components/library/SearchInput';
import { RecipeCard } from '@components/recipe/RecipeCard';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { XMarkIcon, ClockIcon } from '../icons';
import type { Recipe } from '@/types/recipe';
import type { MealSlot, AvailableLeftover } from '@/types/menu';

/**
 * Props for RecipePicker component
 */
export interface RecipePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
  onSelectLeftover?: (leftover: AvailableLeftover) => void;
  date: Date;
  mealSlot: MealSlot;
  menuId?: string;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get meal slot label
 */
function getMealSlotLabel(slot: MealSlot): string {
  const labels: Record<MealSlot, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };
  return labels[slot];
}

/**
 * Leftover suggestion card component
 */
function LeftoverSuggestionCard({
  leftover,
  onSelect,
}: {
  leftover: AvailableLeftover;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-3 rounded-lg text-left transition-colors ${
        leftover.isExpiringSoon
          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
          : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍱</span>
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {leftover.recipeTitle || 'Leftover'}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Cooked on {leftover.assignment.cookDate.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <ClockIcon className="w-3 h-3" />
          <span
            className={
              leftover.isExpiringSoon
                ? 'text-amber-600 dark:text-amber-400 font-medium'
                : 'text-green-600 dark:text-green-400'
            }
          >
            {leftover.daysUntilExpiry === 0
              ? 'Expires today'
              : leftover.daysUntilExpiry === 1
              ? 'Expires tomorrow'
              : `${leftover.daysUntilExpiry} days left`}
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Recipe Picker Component
 */
export function RecipePicker({
  isOpen,
  onClose,
  onSelect,
  onSelectLeftover,
  date,
  mealSlot,
  menuId,
}: RecipePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showLeftovers, setShowLeftovers] = useState(true);

  // Get current menu if menuId not provided
  const { data: currentMenu } = useCurrentMenu();
  const effectiveMenuId = menuId ?? currentMenu?.id;

  // Get available leftovers for the target date
  const { data: availableLeftovers = [] } = useAvailableLeftovers(effectiveMenuId, date);

  const { data: searchResult, isLoading } = useAdvancedRecipeSearch({
    filters: { query: searchQuery || undefined },
    limit: 50,
  });

  const recipes = searchResult?.items || [];

  const handleSelect = useCallback(
    (recipe: Recipe) => {
      onSelect(recipe);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleSelectLeftover = useCallback(
    (leftover: AvailableLeftover) => {
      if (onSelectLeftover) {
        onSelectLeftover(leftover);
      }
      onClose();
    },
    [onSelectLeftover, onClose]
  );

  if (!isOpen) return null;

  const hasLeftovers = availableLeftovers.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add Recipe
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getMealSlotLabel(mealSlot)} on {formatDate(date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Available Leftovers Section */}
        {hasLeftovers && showLeftovers && onSelectLeftover && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span>🍱</span>
                Available Leftovers
              </h3>
              <button
                onClick={() => setShowLeftovers(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Hide
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableLeftovers.map((leftover) => (
                <LeftoverSuggestionCard
                  key={leftover.assignment.id}
                  leftover={leftover}
                  onSelect={() => handleSelectLeftover(leftover)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Show leftovers toggle if hidden */}
        {hasLeftovers && !showLeftovers && onSelectLeftover && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowLeftovers(true)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              <span>🍱</span>
              Show {availableLeftovers.length} available leftover{availableLeftovers.length > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search recipes..."
            autoFocus
          />
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No recipes found' : 'No recipes yet'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  variant="compact"
                  showQuickActions={false}
                  onTap={() => handleSelect(recipe)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
