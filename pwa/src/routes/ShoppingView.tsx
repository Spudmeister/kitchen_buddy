/**
 * Shopping View - "What do we need?"
 *
 * Entry point for shopping list management.
 * Displays shopping list with category grouping, progress indicator,
 * and works fully offline.
 *
 * Requirements: 18.1, 18.2, 18.3, 19.1, 19.2, 19.3, 19.4, 19.5, 20.1, 20.2, 20.3, 20.4
 */

import { useCallback, useMemo } from 'react';
import {
  useShoppingListForMenu,
  useShoppingProgress,
  useToggleShoppingItem,
  useAddCustomItem,
  useDeleteShoppingItem,
  useGenerateShoppingList,
} from '@hooks/useShopping';
import { useCurrentMenu } from '@hooks/useMenus';
import { useRecipes } from '@hooks/useRecipes';
import { ShoppingList, ShoppingProgress, CustomItemForm } from '@components/shopping';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { useUIStore } from '@stores/ui-store';
import { ListBulletIcon, ArrowPathIcon } from '@components/icons';
import type { CustomItemInput } from '@/types/shopping';

/**
 * Empty state when no shopping list exists
 */
function EmptyShoppingState({
  hasMenu,
  onGenerate,
  isGenerating,
}: {
  hasMenu: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <ListBulletIcon className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No Shopping List Yet
      </h2>
      {hasMenu ? (
        <>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
            Generate a shopping list from your current menu to see all the ingredients you need.
          </p>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" />
                Generating...
              </>
            ) : (
              <>
                <ListBulletIcon className="w-5 h-5" />
                Generate Shopping List
              </>
            )}
          </button>
        </>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Create a menu first, then generate a shopping list from it.
        </p>
      )}
    </div>
  );
}

/**
 * Shopping View Component
 */
export default function ShoppingView() {
  const showToast = useUIStore((state) => state.showToast);

  // Get current menu
  const { data: currentMenu, isLoading: menuLoading } = useCurrentMenu();

  // Get shopping list for current menu
  const {
    data: shoppingList,
    isLoading: listLoading,
    refetch: refetchList,
  } = useShoppingListForMenu(currentMenu?.id);

  // Get progress
  const { data: progress } = useShoppingProgress(shoppingList?.id);

  // Get all recipes for title lookup
  const { data: recipes = [] } = useRecipes();

  // Create recipe title map for display
  const recipeTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const recipe of recipes) {
      map.set(recipe.id, recipe.title);
    }
    return map;
  }, [recipes]);

  // Mutations
  const generateList = useGenerateShoppingList();
  const toggleItem = useToggleShoppingItem();
  const addCustomItem = useAddCustomItem();
  const deleteItem = useDeleteShoppingItem();

  // Handlers
  const handleGenerate = useCallback(() => {
    if (!currentMenu) return;

    generateList.mutate(currentMenu.id, {
      onSuccess: () => {
        showToast({ type: 'success', message: 'Shopping list generated!' });
        refetchList();
      },
      onError: (error) => {
        showToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate list',
        });
      },
    });
  }, [currentMenu, generateList, showToast, refetchList]);

  const handleRegenerate = useCallback(() => {
    if (!currentMenu) return;

    generateList.mutate(currentMenu.id, {
      onSuccess: () => {
        showToast({ type: 'success', message: 'Shopping list regenerated!' });
        refetchList();
      },
      onError: (error) => {
        showToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to regenerate list',
        });
      },
    });
  }, [currentMenu, generateList, showToast, refetchList]);

  const handleToggleItem = useCallback(
    (itemId: string, checked: boolean) => {
      if (!shoppingList) return;

      toggleItem.mutate(
        { listId: shoppingList.id, itemId, checked },
        {
          onError: (error) => {
            showToast({
              type: 'error',
              message: error instanceof Error ? error.message : 'Failed to update item',
            });
          },
        }
      );
    },
    [shoppingList, toggleItem, showToast]
  );

  const handleAddCustomItem = useCallback(
    (input: CustomItemInput) => {
      if (!shoppingList) return;

      addCustomItem.mutate(
        { listId: shoppingList.id, input },
        {
          onSuccess: () => {
            showToast({ type: 'success', message: 'Item added!' });
          },
          onError: (error) => {
            showToast({
              type: 'error',
              message: error instanceof Error ? error.message : 'Failed to add item',
            });
          },
        }
      );
    },
    [shoppingList, addCustomItem, showToast]
  );

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      if (!shoppingList) return;

      deleteItem.mutate(
        { listId: shoppingList.id, itemId },
        {
          onSuccess: () => {
            showToast({ type: 'success', message: 'Item removed' });
          },
          onError: (error) => {
            showToast({
              type: 'error',
              message: error instanceof Error ? error.message : 'Failed to remove item',
            });
          },
        }
      );
    },
    [shoppingList, deleteItem, showToast]
  );

  // Loading state
  if (menuLoading || listLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Empty state - no shopping list
  if (!shoppingList) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Shop</h1>
        <EmptyShoppingState
          hasMenu={!!currentMenu}
          onGenerate={handleGenerate}
          isGenerating={generateList.isPending}
        />
      </div>
    );
  }

  // Main shopping view
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentMenu?.name || 'Shopping List'}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={generateList.isPending}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Regenerate list from menu"
        >
          <ArrowPathIcon className={`w-4 h-4 ${generateList.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Progress indicator - Requirements: 19.3, 19.4 */}
      {progress && progress.total > 0 && (
        <ShoppingProgress
          checked={progress.checked}
          total={progress.total}
          percentage={progress.percentage}
        />
      )}

      {/* Shopping list - Requirements: 18.1, 18.2, 18.3, 19.1, 19.2 */}
      <ShoppingList
        list={shoppingList}
        onToggleItem={handleToggleItem}
        onDeleteItem={handleDeleteItem}
        recipeTitles={recipeTitles}
      />

      {/* Custom item form - Requirements: 20.1, 20.2, 20.3, 20.4 */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <CustomItemForm onAdd={handleAddCustomItem} isLoading={addCustomItem.isPending} />
      </div>
    </div>
  );
}
