/**
 * React Query hooks for shopping list data
 *
 * Provides data fetching, caching, and mutations for shopping lists.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5, 20.1, 20.2, 20.3, 20.4
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase } from '@db/browser-database';
import { ShoppingService } from '@services/shopping-service';
import { MenuService } from '@services/menu-service';
import { RecipeService } from '@services/recipe-service';
import type { CustomItemInput } from '@/types/shopping';

/**
 * Get the shopping service instance
 */
function getShoppingService(): ShoppingService {
  const db = getDatabase();
  const menuService = new MenuService(db);
  const recipeService = new RecipeService(db);
  return new ShoppingService(db, menuService, recipeService);
}

/**
 * Query keys for shopping
 */
export const shoppingKeys = {
  all: ['shopping'] as const,
  lists: () => [...shoppingKeys.all, 'list'] as const,
  detail: (id: string) => [...shoppingKeys.all, 'detail', id] as const,
  forMenu: (menuId: string) => [...shoppingKeys.all, 'menu', menuId] as const,
  progress: (id: string) => [...shoppingKeys.all, 'progress', id] as const,
  byCategory: (id: string) => [...shoppingKeys.all, 'category', id] as const,
};

/**
 * Hook to fetch a shopping list by ID
 */
export function useShoppingList(id: string | undefined) {
  return useQuery({
    queryKey: shoppingKeys.detail(id ?? ''),
    queryFn: () => {
      if (!id) return Promise.resolve(undefined);
      const service = getShoppingService();
      return Promise.resolve(service.getList(id));
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch a shopping list for a menu
 */
export function useShoppingListForMenu(menuId: string | undefined) {
  return useQuery({
    queryKey: shoppingKeys.forMenu(menuId ?? ''),
    queryFn: () => {
      if (!menuId) return Promise.resolve(undefined);
      const service = getShoppingService();
      return Promise.resolve(service.getListForMenu(menuId));
    },
    enabled: !!menuId,
  });
}

/**
 * Hook to get shopping list progress
 * Requirements: 19.3 - Show progress
 */
export function useShoppingProgress(listId: string | undefined) {
  return useQuery({
    queryKey: shoppingKeys.progress(listId ?? ''),
    queryFn: () => {
      if (!listId) return Promise.resolve({ checked: 0, total: 0, percentage: 0 });
      const service = getShoppingService();
      return Promise.resolve(service.getProgress(listId));
    },
    enabled: !!listId,
  });
}

/**
 * Hook to generate a shopping list from a menu
 * Requirements: 18.1 - Consolidate all ingredients from menu
 */
export function useGenerateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (menuId: string) => {
      const service = getShoppingService();
      return Promise.resolve(service.generateFromMenu(menuId));
    },
    onSuccess: (list) => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: shoppingKeys.forMenu(list.menuId ?? '') });
      queryClient.setQueryData(shoppingKeys.detail(list.id), list);
    },
  });
}

/**
 * Hook to check/uncheck a shopping item
 * Requirements: 19.1 - Toggle checked state on tap
 */
export function useToggleShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, itemId, checked }: { listId: string; itemId: string; checked: boolean }) => {
      const service = getShoppingService();
      if (checked) {
        service.checkItem(listId, itemId);
      } else {
        service.uncheckItem(listId, itemId);
      }
      return Promise.resolve({ listId, itemId, checked });
    },
    onMutate: async ({ listId, itemId, checked }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: shoppingKeys.detail(listId) });

      // Snapshot the previous value
      const previousList = queryClient.getQueryData(shoppingKeys.detail(listId));

      // Optimistically update the list
      queryClient.setQueryData(shoppingKeys.detail(listId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item: any) =>
            item.id === itemId ? { ...item, checked } : item
          ),
        };
      });

      return { previousList };
    },
    onError: (_err, { listId }, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(shoppingKeys.detail(listId), context.previousList);
      }
    },
    onSettled: (_data, _error, { listId }) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: shoppingKeys.detail(listId) });
      queryClient.invalidateQueries({ queryKey: shoppingKeys.progress(listId) });
    },
  });
}

/**
 * Hook to add a custom item to a shopping list
 * Requirements: 20.1, 20.2, 20.3, 20.4 - Add non-recipe items
 */
export function useAddCustomItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, input }: { listId: string; input: CustomItemInput }) => {
      const service = getShoppingService();
      return Promise.resolve(service.addCustomItem(listId, input));
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.detail(item.listId) });
      queryClient.invalidateQueries({ queryKey: shoppingKeys.progress(item.listId) });
    },
  });
}

/**
 * Hook to delete a shopping item
 * Requirements: 20.4 - Allow deletion
 */
export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) => {
      const service = getShoppingService();
      service.deleteItem(listId, itemId);
      return Promise.resolve({ listId, itemId });
    },
    onSuccess: ({ listId }) => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.detail(listId) });
      queryClient.invalidateQueries({ queryKey: shoppingKeys.progress(listId) });
    },
  });
}

/**
 * Hook to delete a shopping list
 */
export function useDeleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => {
      const service = getShoppingService();
      service.deleteList(listId);
      return Promise.resolve(listId);
    },
    onSuccess: (listId) => {
      queryClient.invalidateQueries({ queryKey: shoppingKeys.detail(listId) });
      queryClient.invalidateQueries({ queryKey: shoppingKeys.lists() });
    },
  });
}
