/**
 * Cooking View - "Let's make it!"
 *
 * Entry point for cooking flow.
 * - Display today's menu items
 * - Show recent recipes
 * - Provide quick start to any recipe
 * - Entry point for meal prep mode
 *
 * Requirements: 21.1, 21.4
 */

import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCurrentMenu } from '../hooks/useMenus';
import { useRecipes, useRecipe } from '../hooks/useRecipes';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { ChefHatIcon, ClockIcon, PlayIcon, UsersIcon, SearchIcon } from '../components/icons';
import type { Recipe } from '../types/recipe';
import type { MenuAssignment } from '../types/menu';

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
 * Get today's date at midnight for comparison
 */
function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = getTodayStart();
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === today.getTime();
}

/**
 * Today's Menu Item Component
 */
function TodayMenuItem({
  assignment,
  recipe,
  onCookNow,
}: {
  assignment: MenuAssignment;
  recipe: Recipe;
  onCookNow: () => void;
}) {
  const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;

  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Recipe thumbnail */}
      <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
        <span className="text-2xl">🍽️</span>
      </div>

      {/* Recipe info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 font-medium uppercase tracking-wide mb-1">
          {assignment.mealSlot}
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{recipe.title}</h3>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            {formatDuration(totalTime)}
          </span>
          <span className="flex items-center gap-1">
            <UsersIcon className="w-4 h-4" />
            {assignment.servings} servings
          </span>
        </div>
      </div>

      {/* Cook now button */}
      <button
        onClick={onCookNow}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex-shrink-0"
        aria-label={`Start cooking ${recipe.title}`}
      >
        <PlayIcon className="w-5 h-5" />
        <span className="hidden sm:inline">Cook</span>
      </button>
    </div>
  );
}

/**
 * Today's Menu Item Wrapper - fetches recipe data
 */
function TodayMenuItemWrapper({
  assignment,
  onCookNow,
}: {
  assignment: MenuAssignment;
  onCookNow: (recipeId: string) => void;
}) {
  const { data: recipe } = useRecipe(assignment.recipeId);

  if (!recipe) {
    return (
      <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    );
  }

  return (
    <TodayMenuItem
      assignment={assignment}
      recipe={recipe}
      onCookNow={() => onCookNow(recipe.id)}
    />
  );
}

/**
 * Empty state when no recipes to cook today
 */
function EmptyTodayState() {
  return (
    <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      <ChefHatIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
      <h3 className="font-medium text-gray-900 dark:text-white mb-1">Nothing planned for today</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Add recipes to your menu or start cooking any recipe from your library.
      </p>
      <Link
        to="/plan"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Plan your meals
      </Link>
    </div>
  );
}

/**
 * Quick Start Section - search and browse recipes
 */
function QuickStartSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
      <h2 className="text-lg font-semibold mb-2">Quick Start</h2>
      <p className="text-primary-100 text-sm mb-4">
        Jump straight into cooking any recipe from your library.
      </p>
      <button
        onClick={() => navigate('/search')}
        className="flex items-center gap-2 w-full px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
      >
        <SearchIcon className="w-5 h-5" />
        <span>Search recipes to cook...</span>
      </button>
    </div>
  );
}

/**
 * Meal Prep Entry Point
 */
function MealPrepSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <UsersIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Meal Prep Mode</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Cook multiple recipes at once with consolidated prep tasks.
          </p>
          <button
            onClick={() => navigate('/cook/prep')}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            Start meal prep →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Recent Recipes Section
 */
function RecentRecipesSection({
  recipes,
  onCookNow,
}: {
  recipes: Recipe[];
  onCookNow: (id: string) => void;
}) {
  if (recipes.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Recipes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recipes.slice(0, 6).map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            variant="standard"
            showQuickActions
            onQuickAction={(action) => {
              if (action === 'cook-now') {
                onCookNow(recipe.id);
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Cooking View Component
 */
export default function CookingView() {
  const navigate = useNavigate();
  const { data: currentMenu } = useCurrentMenu();
  const { data: allRecipes } = useRecipes();

  // Get today's menu items
  const todaysAssignments = useMemo(() => {
    if (!currentMenu?.assignments) return [];
    return currentMenu.assignments.filter((a) => isToday(a.date));
  }, [currentMenu]);

  // Get recent recipes (sorted by updatedAt, most recent first)
  const recentRecipes = useMemo(() => {
    if (!allRecipes) return [];
    return [...allRecipes]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [allRecipes]);

  // Handle cook now action
  const handleCookNow = (recipeId: string) => {
    navigate(`/recipe/${recipeId}/cook`);
  };

  return (
    <div className="p-4 pb-24 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cook</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Let's make something delicious!</p>
      </header>

      {/* Today's Menu */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Menu</h2>
        {todaysAssignments.length > 0 ? (
          <div className="space-y-3">
            {todaysAssignments.map((assignment) => (
              <TodayMenuItemWrapper
                key={assignment.id}
                assignment={assignment}
                onCookNow={handleCookNow}
              />
            ))}
          </div>
        ) : (
          <EmptyTodayState />
        )}
      </section>

      {/* Quick Start */}
      <QuickStartSection />

      {/* Meal Prep Entry */}
      <MealPrepSection />

      {/* Recent Recipes */}
      <RecentRecipesSection recipes={recentRecipes} onCookNow={handleCookNow} />
    </div>
  );
}
