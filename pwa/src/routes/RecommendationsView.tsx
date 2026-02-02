/**
 * Recommendations View - Full page for recipe recommendations
 *
 * Displays all recommendation sections with navigation to Recipe Detail.
 * Quick Actions are available on all recommendation cards.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useFavorites,
  useDeepCuts,
  useRecentlyAdded,
  useNotCookedRecently,
} from '@hooks/useRecommendations';
import { RecommendationsView as RecommendationsContent } from '@components/planning';
import { ChevronLeftIcon } from '@components/icons';
import { useUIStore } from '@stores/ui-store';
import type { Recipe } from '@/types/recipe';
import type { QuickActionType } from '@components/recipe/RecipeCard';
import { useAssignRecipe, useCurrentMenu } from '@hooks/useMenus';
import { useArchiveRecipe, useDuplicateRecipe } from '@hooks/useRecipes';

/**
 * Recommendations View Component
 */
export default function RecommendationsView() {
  const navigate = useNavigate();
  const showToast = useUIStore((state) => state.showToast);

  // Fetch recommendations
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites(10);
  const { data: deepCuts = [], isLoading: deepCutsLoading } = useDeepCuts(10);
  const { data: recentlyAdded = [], isLoading: recentlyAddedLoading } = useRecentlyAdded(10);
  const { data: notCookedRecently = [], isLoading: notCookedRecentlyLoading } = useNotCookedRecently(10);

  // Mutations for quick actions
  const { data: currentMenu } = useCurrentMenu();
  const assignRecipe = useAssignRecipe();
  const duplicateRecipe = useDuplicateRecipe();
  const archiveRecipe = useArchiveRecipe();

  // Handle recipe tap - navigate to Recipe Detail
  const handleRecipeTap = useCallback(
    (recipe: Recipe) => {
      navigate(`/recipe/${recipe.id}`);
    },
    [navigate]
  );

  // Handle quick actions
  const handleQuickAction = useCallback(
    (recipe: Recipe, action: QuickActionType) => {
      switch (action) {
        case 'cook-now':
          navigate(`/recipe/${recipe.id}/cook`);
          break;
        case 'add-to-menu':
          if (currentMenu) {
            // For simplicity, add to today's dinner slot
            assignRecipe.mutate(
              {
                menuId: currentMenu.id,
                input: {
                  recipeId: recipe.id,
                  date: new Date(),
                  mealSlot: 'dinner',
                },
              },
              {
                onSuccess: () => {
                  showToast({ type: 'success', message: `Added ${recipe.title} to menu` });
                },
                onError: (error) => {
                  showToast({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Failed to add to menu',
                  });
                },
              }
            );
          } else {
            showToast({ type: 'info', message: 'Create a menu first to add recipes' });
          }
          break;
        case 'edit':
          navigate(`/recipe/${recipe.id}/edit`);
          break;
        case 'duplicate':
          duplicateRecipe.mutate(recipe.id, {
            onSuccess: (newRecipe) => {
              showToast({ type: 'success', message: `Created copy: ${newRecipe.title}` });
            },
            onError: (error) => {
              showToast({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to duplicate',
              });
            },
          });
          break;
        case 'delete':
          archiveRecipe.mutate(recipe.id, {
            onSuccess: () => {
              showToast({ type: 'success', message: `Archived ${recipe.title}` });
            },
            onError: (error) => {
              showToast({
                type: 'error',
                message: error instanceof Error ? error.message : 'Failed to archive',
              });
            },
          });
          break;
        case 'share':
          if (navigator.share) {
            navigator.share({
              title: recipe.title,
              text: `Check out this recipe: ${recipe.title}`,
              url: `${window.location.origin}/recipe/${recipe.id}`,
            });
          } else {
            // Fallback: copy link to clipboard
            navigator.clipboard.writeText(`${window.location.origin}/recipe/${recipe.id}`);
            showToast({ type: 'success', message: 'Link copied to clipboard' });
          }
          break;
        case 'scale':
          navigate(`/recipe/${recipe.id}?scale=true`);
          break;
      }
    },
    [navigate, currentMenu, assignRecipe, duplicateRecipe, archiveRecipe, showToast]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recommendations
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Based on your favorites and history
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        <RecommendationsContent
          favorites={favorites}
          deepCuts={deepCuts}
          recentlyAdded={recentlyAdded}
          notCookedRecently={notCookedRecently}
          isLoading={{
            favorites: favoritesLoading,
            deepCuts: deepCutsLoading,
            recentlyAdded: recentlyAddedLoading,
            notCookedRecently: notCookedRecentlyLoading,
          }}
          onRecipeTap={handleRecipeTap}
          onQuickAction={handleQuickAction}
        />
      </main>
    </div>
  );
}
