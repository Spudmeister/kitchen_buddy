/**
 * React Query hooks for Sue (Menu Assistant)
 *
 * Provides data fetching, caching, and mutations for Sue operations.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase } from '@db/browser-database';
import { SueService } from '@services/sue-service';
import { useSueStore } from '@stores/sue-store';
import type { MenuConstraints, VarietyPreferences } from '@/types/sue';
import type { Menu, MealSlot } from '@/types/menu';

/**
 * Get the Sue service instance
 */
function getSueService(): SueService {
  const db = getDatabase();
  return new SueService(db);
}

/**
 * Query keys for Sue
 */
export const sueKeys = {
  all: ['sue'] as const,
  availability: () => [...sueKeys.all, 'availability'] as const,
  suggestions: (constraints: MenuConstraints, menuId?: string) =>
    [...sueKeys.all, 'suggestions', constraints, menuId] as const,
};

/**
 * Hook to check if Sue is available
 * Requirements: 16.1, 16.6 - Available only when AI is enabled
 */
export function useSueAvailability() {
  return useQuery({
    queryKey: sueKeys.availability(),
    queryFn: () => {
      const service = getSueService();
      return service.isAvailable();
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });
}

/**
 * Hook to get Sue suggestions
 * Requirements: 16.2, 16.3, 16.4
 */
export function useSueSuggestions(
  constraints: MenuConstraints,
  menu: Menu | undefined,
  varietyPreferences: VarietyPreferences,
  excludeRecipeIds: string[] = [],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: sueKeys.suggestions(constraints, menu?.id),
    queryFn: () => {
      const service = getSueService();
      return service.getSuggestionsWithVariety(
        constraints,
        menu,
        varietyPreferences,
        excludeRecipeIds,
        5
      );
    },
    enabled,
    staleTime: 1000 * 30, // Cache for 30 seconds
  });
}

/**
 * Hook to send a message to Sue
 */
export function useSueChat() {
  const queryClient = useQueryClient();
  const {
    addUserMessage,
    addAssistantMessage,
    setTyping,
    constraints,
    varietyPreferences,
    recentlySuggested,
    rejectedSuggestions,
    currentMenuId,
  } = useSueStore();

  return useMutation({
    mutationFn: async ({
      message,
      menu,
    }: {
      message: string;
      menu: Menu | undefined;
    }) => {
      // Add user message
      addUserMessage(message);
      setTyping(true);

      try {
        const service = getSueService();
        const excludeIds = [...recentlySuggested, ...rejectedSuggestions];
        
        // Generate response
        const response = service.generateResponse(
          message,
          constraints,
          menu,
          varietyPreferences,
          excludeIds
        );

        return response;
      } finally {
        setTyping(false);
      }
    },
    onSuccess: (response) => {
      addAssistantMessage(response.message, response.suggestions);
      
      // Invalidate suggestions cache
      queryClient.invalidateQueries({ queryKey: sueKeys.suggestions(constraints, currentMenuId) });
    },
  });
}

/**
 * Hook to accept a Sue suggestion
 * Requirements: 16.4 - Add suggested recipes to menu
 */
export function useAcceptSuggestion() {
  const queryClient = useQueryClient();
  const { acceptSuggestion: trackAccepted } = useSueStore();

  return useMutation({
    mutationFn: async ({
      menuId,
      recipeId,
      date,
      mealSlot,
      servings,
    }: {
      menuId: string;
      recipeId: string;
      date: Date;
      mealSlot: MealSlot;
      servings?: number;
    }) => {
      const service = getSueService();
      return service.acceptSuggestion(menuId, recipeId, date, mealSlot, servings);
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        trackAccepted(variables.recipeId);
        
        // Invalidate menu queries
        queryClient.invalidateQueries({ queryKey: ['menus'] });
      }
    },
  });
}

/**
 * Hook to enable/disable AI
 */
export function useToggleAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const service = getSueService();
      if (enabled) {
        service.enableAI();
      } else {
        service.disableAI();
      }
      return enabled;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sueKeys.availability() });
    },
  });
}

/**
 * Hook to filter recipes by constraints
 * Requirements: 16.2, 16.5
 */
export function useFilteredRecipes(
  constraints: MenuConstraints,
  limit: number = 10,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['sue', 'filtered-recipes', constraints, limit],
    queryFn: () => {
      const service = getSueService();
      return service.filterRecipesByConstraints(constraints, limit);
    },
    enabled,
  });
}

/**
 * Hook to get used cuisines in a menu
 */
export function useUsedCuisines(menu: Menu | undefined) {
  return useQuery({
    queryKey: ['sue', 'used-cuisines', menu?.id],
    queryFn: () => {
      if (!menu) return [];
      const service = getSueService();
      return Array.from(service.getUsedCuisines(menu));
    },
    enabled: !!menu,
  });
}

/**
 * Hook to get used main ingredients in a menu
 */
export function useUsedMainIngredients(menu: Menu | undefined) {
  return useQuery({
    queryKey: ['sue', 'used-ingredients', menu?.id],
    queryFn: () => {
      if (!menu) return [];
      const service = getSueService();
      return Array.from(service.getUsedMainIngredients(menu));
    },
    enabled: !!menu,
  });
}
