/**
 * Brainstorm View - "What's in the fridge?"
 *
 * Find recipes based on available ingredients.
 * Displays matching recipes sorted by missing ingredient count,
 * shows which ingredients match and which are missing,
 * and provides substitution options for missing ingredients.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecipes } from '@hooks/useRecipes';
import { RecipeCard, type QuickActionType } from '@components/recipe/RecipeCard';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { useUIStore } from '@stores/ui-store';
import {
  BeakerIcon,
  ChevronLeftIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ArrowsRightLeftIcon,
} from '@components/icons';
import { getSubstitutions } from '@services/substitution-service';
import type { Recipe } from '@/types/recipe';
import type { Substitution } from '@/types/substitution';

/**
 * Result of matching a recipe against available ingredients
 */
interface BrainstormResult {
  recipe: Recipe;
  matchingIngredients: string[];
  missingIngredients: MissingIngredient[];
  matchScore: number; // 0-1, higher is better
}

/**
 * A missing ingredient with potential substitutions
 */
interface MissingIngredient {
  name: string;
  substitutions: Substitution[];
}

/**
 * Normalize ingredient name for comparison
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(fresh|dried|ground|chopped|minced|sliced|diced|whole|large|medium|small)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if an available ingredient matches a recipe ingredient
 */
function ingredientMatches(available: string, recipeIngredient: string): boolean {
  const normalizedAvailable = normalizeIngredientName(available);
  const normalizedRecipe = normalizeIngredientName(recipeIngredient);

  // Exact match
  if (normalizedAvailable === normalizedRecipe) return true;

  // Partial match (available is contained in recipe ingredient or vice versa)
  if (normalizedRecipe.includes(normalizedAvailable)) return true;
  if (normalizedAvailable.includes(normalizedRecipe)) return true;

  return false;
}

/**
 * Match recipes against available ingredients
 * Requirements: 15.2, 15.3, 15.4
 */
function matchRecipes(recipes: Recipe[], availableIngredients: string[]): BrainstormResult[] {
  if (availableIngredients.length === 0) return [];

  const results: BrainstormResult[] = recipes.map((recipe) => {
    const matchingIngredients: string[] = [];
    const missingIngredients: MissingIngredient[] = [];

    for (const ingredient of recipe.ingredients) {
      const isMatched = availableIngredients.some((available) =>
        ingredientMatches(available, ingredient.name)
      );

      if (isMatched) {
        matchingIngredients.push(ingredient.name);
      } else {
        // Get substitutions for missing ingredient
        const substitutions = getSubstitutions(ingredient.name);
        missingIngredients.push({
          name: ingredient.name,
          substitutions,
        });
      }
    }

    // Calculate match score (percentage of ingredients matched)
    const totalIngredients = recipe.ingredients.length;
    const matchScore = totalIngredients > 0 ? matchingIngredients.length / totalIngredients : 0;

    return {
      recipe,
      matchingIngredients,
      missingIngredients,
      matchScore,
    };
  });

  // Sort by missing ingredient count (fewest first), then by match score
  // Requirements: 15.3
  return results
    .filter((r) => r.matchingIngredients.length > 0) // Only show recipes with at least one match
    .sort((a, b) => {
      // Primary sort: fewer missing ingredients first
      const missingDiff = a.missingIngredients.length - b.missingIngredients.length;
      if (missingDiff !== 0) return missingDiff;

      // Secondary sort: higher match score first
      return b.matchScore - a.matchScore;
    });
}

/**
 * Ingredient Tag Component
 */
function IngredientTag({
  ingredient,
  onRemove,
}: {
  ingredient: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm">
      {ingredient}
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full"
        aria-label={`Remove ${ingredient}`}
      >
        <XMarkIcon className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

/**
 * Ingredient Input Component
 * Requirements: 15.1
 */
function IngredientInput({
  ingredients,
  onAdd,
  onRemove,
}: {
  ingredients: string[];
  onAdd: (ingredient: string) => void;
  onRemove: (ingredient: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !ingredients.includes(trimmed.toLowerCase())) {
        onAdd(trimmed);
        setInputValue('');
      }
    },
    [inputValue, ingredients, onAdd]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (trimmed && !ingredients.includes(trimmed.toLowerCase())) {
          onAdd(trimmed);
          setInputValue('');
        }
      }
    },
    [inputValue, ingredients, onAdd]
  );

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter an ingredient..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          aria-label="Enter ingredient"
        />
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Add
        </button>
      </form>

      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ingredients.map((ingredient) => (
            <IngredientTag
              key={ingredient}
              ingredient={ingredient}
              onRemove={() => onRemove(ingredient)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Substitution Badge Component
 * Requirements: 15.5
 */
function SubstitutionBadge({
  substitution,
  onClick,
}: {
  substitution: Substitution;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
      title={substitution.notes}
    >
      <ArrowsRightLeftIcon className="w-3 h-3" />
      {substitution.substitute}
      {substitution.ratio !== 1 && (
        <span className="text-amber-600 dark:text-amber-400">({substitution.ratio}x)</span>
      )}
    </button>
  );
}

/**
 * Missing Ingredient Item Component
 * Requirements: 15.4, 15.5
 */
function MissingIngredientItem({
  ingredient,
  onSubstitutionSelect,
}: {
  ingredient: MissingIngredient;
  onSubstitutionSelect?: (substitution: Substitution) => void;
}) {
  const [showAllSubs, setShowAllSubs] = useState(false);
  const displayedSubs = showAllSubs
    ? ingredient.substitutions
    : ingredient.substitutions.slice(0, 2);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-red-600 dark:text-red-400 text-sm">{ingredient.name}</span>
      {ingredient.substitutions.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {displayedSubs.map((sub, idx) => (
            <SubstitutionBadge
              key={idx}
              substitution={sub}
              onClick={() => onSubstitutionSelect?.(sub)}
            />
          ))}
          {ingredient.substitutions.length > 2 && !showAllSubs && (
            <button
              onClick={() => setShowAllSubs(true)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              +{ingredient.substitutions.length - 2} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Brainstorm Result Card Component
 * Requirements: 15.3, 15.4, 15.5
 */
function BrainstormResultCard({
  result,
  onRecipeTap,
  onQuickAction,
}: {
  result: BrainstormResult;
  onRecipeTap: (recipe: Recipe) => void;
  onQuickAction: (recipe: Recipe, action: QuickActionType) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const matchPercentage = Math.round(result.matchScore * 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Recipe Card */}
      <RecipeCard
        recipe={result.recipe}
        variant="compact"
        showQuickActions
        onTap={() => onRecipeTap(result.recipe)}
        onQuickAction={(action) => onQuickAction(result.recipe, action)}
      />

      {/* Ingredient Match Summary */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <CheckIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                {result.matchingIngredients.length} matched
              </span>
            </div>
            {result.missingIngredients.length > 0 && (
              <div className="flex items-center gap-1">
                <XMarkIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  {result.missingIngredients.length} missing
                </span>
              </div>
            )}
          </div>
          <span
            className={`text-sm font-medium ${
              matchPercentage >= 75
                ? 'text-green-600 dark:text-green-400'
                : matchPercentage >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {matchPercentage}% match
          </span>
        </div>

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          {expanded ? 'Hide details' : 'Show ingredient details'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Matching Ingredients */}
            {result.matchingIngredients.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  You have
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.matchingIngredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Ingredients with Substitutions */}
            {result.missingIngredients.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  You need
                </h4>
                <div className="space-y-2">
                  {result.missingIngredients.map((ing, idx) => (
                    <MissingIngredientItem key={idx} ingredient={ing} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState({ hasIngredients }: { hasIngredients: boolean }) {
  if (!hasIngredients) {
    return (
      <div className="text-center py-12">
        <BeakerIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          What's in your fridge?
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Enter the ingredients you have on hand, and we'll find recipes you can make.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <BeakerIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No matches found</h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
        Try adding more ingredients or different ones to find matching recipes.
      </p>
    </div>
  );
}

/**
 * Brainstorm View Component
 */
export default function BrainstormView() {
  const navigate = useNavigate();
  const showToast = useUIStore((state) => state.showToast);

  // State
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);

  // Data
  const { data: recipes = [], isLoading } = useRecipes();

  // Compute matching recipes
  const results = useMemo(
    () => matchRecipes(recipes, availableIngredients),
    [recipes, availableIngredients]
  );

  // Handlers
  const handleAddIngredient = useCallback((ingredient: string) => {
    setAvailableIngredients((prev) => [...prev, ingredient.toLowerCase()]);
  }, []);

  const handleRemoveIngredient = useCallback((ingredient: string) => {
    setAvailableIngredients((prev) => prev.filter((i) => i !== ingredient));
  }, []);

  // Handle recipe tap - navigate to Recipe Detail
  // Requirements: 15.6
  const handleRecipeTap = useCallback(
    (recipe: Recipe) => {
      navigate(`/recipe/${recipe.id}`);
    },
    [navigate]
  );

  // Handle quick actions on result cards
  // Requirements: 15.6
  const handleQuickAction = useCallback(
    (recipe: Recipe, action: QuickActionType) => {
      switch (action) {
        case 'cook-now':
          navigate(`/recipe/${recipe.id}/cook`);
          break;
        case 'add-to-menu':
          // Navigate to recipe detail where they can add to menu
          navigate(`/recipe/${recipe.id}`);
          showToast({ type: 'info', message: 'Open recipe to add to menu' });
          break;
        case 'edit':
          navigate(`/recipe/${recipe.id}/edit`);
          break;
        default:
          break;
      }
    },
    [navigate, showToast]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate('/plan')}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            aria-label="Back to planning"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Brainstorm</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Find recipes by ingredients
            </p>
          </div>
        </div>

        {/* Ingredient Input */}
        <div className="px-4 pb-4">
          <IngredientInput
            ingredients={availableIngredients}
            onAdd={handleAddIngredient}
            onRemove={handleRemoveIngredient}
          />
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {results.length} recipe{results.length !== 1 ? 's' : ''} found
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Sorted by fewest missing ingredients
              </span>
            </div>

            <div className="space-y-3">
              {results.map((result) => (
                <BrainstormResultCard
                  key={result.recipe.id}
                  result={result}
                  onRecipeTap={handleRecipeTap}
                  onQuickAction={handleQuickAction}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState hasIngredients={availableIngredients.length > 0} />
        )}
      </div>
    </div>
  );
}
