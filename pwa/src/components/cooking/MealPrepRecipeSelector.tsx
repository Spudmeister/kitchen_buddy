/**
 * Meal Prep Recipe Selector Component
 *
 * Allows users to select multiple recipes for meal prep mode.
 * Requirements: 24.1 - Select multiple recipes
 */

import { useState, useMemo } from 'react';
import { useRecipes } from '../../hooks/useRecipes';
import {
  SearchIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  UsersIcon,
  PlayIcon,
} from '../icons';
import type { Recipe } from '../../types/recipe';

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
 * Props for MealPrepRecipeSelector
 */
export interface MealPrepRecipeSelectorProps {
  /** Currently selected recipe IDs */
  selectedRecipeIds: string[];
  /** Servings per recipe */
  servingsPerRecipe: Map<string, number>;
  /** Callback when a recipe is added */
  onAddRecipe: (recipeId: string, defaultServings: number) => void;
  /** Callback when a recipe is removed */
  onRemoveRecipe: (recipeId: string) => void;
  /** Callback when servings are updated */
  onUpdateServings: (recipeId: string, servings: number) => void;
  /** Callback when ready to start */
  onStart: () => void;
}

/**
 * Selected recipe item with servings control
 */
function SelectedRecipeItem({
  recipe,
  servings,
  onUpdateServings,
  onRemove,
}: {
  recipe: Recipe;
  servings: number;
  onUpdateServings: (servings: number) => void;
  onRemove: () => void;
}) {
  const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Recipe thumbnail */}
      <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
        <span className="text-xl">🍽️</span>
      </div>

      {/* Recipe info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
          {recipe.title}
        </h4>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {formatDuration(totalTime)}
          </span>
        </div>
      </div>

      {/* Servings control */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateServings(Math.max(1, servings - 1))}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
          aria-label="Decrease servings"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
          {servings}
        </span>
        <button
          onClick={() => onUpdateServings(servings + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
          aria-label="Increase servings"
        >
          +
        </button>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label={`Remove ${recipe.title}`}
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Recipe selection card
 */
function SelectableRecipeCard({
  recipe,
  isSelected,
  onSelect,
}: {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Selection indicator */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            isSelected
              ? 'bg-primary-600 border-primary-600 text-white'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {isSelected && <CheckIcon className="w-3 h-3" />}
        </div>

        {/* Recipe thumbnail */}
        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
          <span className="text-lg">🍽️</span>
        </div>

        {/* Recipe info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {recipe.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatDuration(totalTime)}
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon className="w-3 h-3" />
              {recipe.servings}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Meal Prep Recipe Selector Component
 */
export function MealPrepRecipeSelector({
  selectedRecipeIds,
  servingsPerRecipe,
  onAddRecipe,
  onRemoveRecipe,
  onUpdateServings,
  onStart,
}: MealPrepRecipeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allRecipes } = useRecipes();

  // Filter recipes based on search
  const filteredRecipes = useMemo(() => {
    if (!allRecipes) return [];
    if (!searchQuery.trim()) return allRecipes;

    const query = searchQuery.toLowerCase();
    return allRecipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [allRecipes, searchQuery]);

  // Get selected recipes
  const selectedRecipes = useMemo(() => {
    if (!allRecipes) return [];
    return selectedRecipeIds
      .map((id) => allRecipes.find((r) => r.id === id))
      .filter((r): r is Recipe => r !== undefined);
  }, [allRecipes, selectedRecipeIds]);

  // Calculate total estimated time
  const totalEstimatedTime = useMemo(() => {
    let minutes = 0;
    for (const recipe of selectedRecipes) {
      minutes += recipe.prepTime.minutes + recipe.cookTime.minutes;
    }
    return minutes;
  }, [selectedRecipes]);

  const handleToggleRecipe = (recipe: Recipe) => {
    if (selectedRecipeIds.includes(recipe.id)) {
      onRemoveRecipe(recipe.id);
    } else {
      onAddRecipe(recipe.id, recipe.servings);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selected recipes section */}
      {selectedRecipes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Selected Recipes ({selectedRecipes.length})
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ~{formatDuration(totalEstimatedTime)} total
            </span>
          </div>
          <div className="space-y-2">
            {selectedRecipes.map((recipe) => (
              <SelectedRecipeItem
                key={recipe.id}
                recipe={recipe}
                servings={servingsPerRecipe.get(recipe.id) ?? recipe.servings}
                onUpdateServings={(servings) => onUpdateServings(recipe.id, servings)}
                onRemove={() => onRemoveRecipe(recipe.id)}
              />
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={onStart}
            disabled={selectedRecipes.length < 1}
            className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayIcon className="w-5 h-5" />
            Start Meal Prep ({selectedRecipes.length} recipes)
          </button>
        </section>
      )}

      {/* Recipe browser section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {selectedRecipes.length > 0 ? 'Add More Recipes' : 'Select Recipes'}
        </h2>

        {/* Search input */}
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Recipe list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredRecipes.map((recipe) => (
            <SelectableRecipeCard
              key={recipe.id}
              recipe={recipe}
              isSelected={selectedRecipeIds.includes(recipe.id)}
              onSelect={() => handleToggleRecipe(recipe)}
            />
          ))}
          {filteredRecipes.length === 0 && (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No recipes found' : 'No recipes available'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default MealPrepRecipeSelector;
