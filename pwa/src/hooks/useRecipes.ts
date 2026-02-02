/**
 * React Query hooks for recipe data
 * 
 * Provides data fetching, caching, and mutations for recipes.
 * 
 * Requirements: 1.4, 30.5
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getDatabase } from '@db/browser-database';
import { RecipeService } from '@services/recipe-service';
import type { Recipe, RecipeInput, RecipeVersion, RecipeHeritage } from '@app-types/recipe';
import type { RecipeFilters, RecipeSort, RecipeSearchParams } from '@app-types/search';

/**
 * Get the recipe service instance
 */
function getRecipeService(): RecipeService {
  const db = getDatabase();
  return new RecipeService(db);
}

/**
 * Query keys for recipes
 */
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  history: (id: string) => [...recipeKeys.all, 'history', id] as const,
  heritage: (id: string) => [...recipeKeys.all, 'heritage', id] as const,
  search: (query: string) => [...recipeKeys.all, 'search', query] as const,
};

/**
 * Hook to fetch a single recipe
 */
export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.detail(id ?? ''),
    queryFn: () => {
      if (!id) return undefined;
      const service = getRecipeService();
      return service.getRecipe(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch all recipes
 */
export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.lists(),
    queryFn: () => {
      const service = getRecipeService();
      return service.getAllRecipes();
    },
  });
}

/**
 * Hook to search recipes
 */
export function useRecipeSearch(query: string) {
  return useQuery({
    queryKey: recipeKeys.search(query),
    queryFn: () => {
      if (!query.trim()) return [];
      const service = getRecipeService();
      return service.searchRecipes(query);
    },
    enabled: query.trim().length > 0,
  });
}

/**
 * Hook for advanced recipe search with filters and sorting
 * Requirements: 3.2, 3.3, 3.4
 */
export function useAdvancedRecipeSearch(params: RecipeSearchParams) {
  return useQuery({
    queryKey: ['recipes', 'advanced-search', params],
    queryFn: () => {
      const service = getRecipeService();
      return service.advancedSearch(params);
    },
  });
}

/**
 * Hook for infinite scroll recipe list
 * Requirements: 3.5
 */
export function useInfiniteRecipes(
  filters?: RecipeFilters,
  sort?: RecipeSort,
  pageSize: number = 20
) {
  return useInfiniteQuery({
    queryKey: ['recipes', 'infinite', filters, sort],
    queryFn: ({ pageParam = 0 }) => {
      const service = getRecipeService();
      return service.advancedSearch({
        filters,
        sort,
        limit: pageSize,
        offset: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
  });
}

/**
 * Hook to get all tags
 */
export function useAllTags() {
  return useQuery({
    queryKey: ['tags', 'all'],
    queryFn: () => {
      const service = getRecipeService();
      return service.getAllTags();
    },
  });
}

/**
 * Hook to get all folders
 */
export function useAllFolders() {
  return useQuery({
    queryKey: ['folders', 'all'],
    queryFn: () => {
      const service = getRecipeService();
      return service.getAllFolders();
    },
  });
}

/**
 * Hook to fetch recipe version history
 */
export function useRecipeHistory(id: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.history(id ?? ''),
    queryFn: () => {
      if (!id) return [];
      const service = getRecipeService();
      return service.getVersionHistory(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch recipe heritage
 */
export function useRecipeHeritage(id: string | undefined) {
  return useQuery({
    queryKey: recipeKeys.heritage(id ?? ''),
    queryFn: () => {
      if (!id) return undefined;
      const service = getRecipeService();
      return service.getRecipeHeritage(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a recipe
 */
export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecipeInput) => {
      const service = getRecipeService();
      return await service.createRecipe(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

/**
 * Hook to update a recipe
 */
export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: RecipeInput }) => {
      const service = getRecipeService();
      return await service.updateRecipe(id, input);
    },
    onSuccess: (recipe: any) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipe.id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.history(recipe.id) });
    },
  });
}

/**
 * Hook to duplicate a recipe
 */
export function useDuplicateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const service = getRecipeService();
      return await service.duplicateRecipe(id);
    },
    onSuccess: (recipe: any) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.heritage(recipe.parentRecipeId ?? '') });
    },
  });
}

/**
 * Hook to archive a recipe
 */
export function useArchiveRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const service = getRecipeService();
      await service.archiveRecipe(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

/**
 * Hook to restore an archived recipe
 */
export function useUnarchiveRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const service = getRecipeService();
      await service.unarchiveRecipe(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}
