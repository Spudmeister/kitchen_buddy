/**
 * React Query hooks for cook session data
 * 
 * Provides data fetching, caching, and mutations for cook sessions.
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 28.1, 28.2, 28.3, 28.4, 29.1, 29.2, 29.3
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase } from '@db/browser-database';
import { StatisticsService } from '@services/statistics-service';
import type { CookSessionInput, StatisticsDateRange } from '../types/statistics';

/**
 * Get the statistics service instance
 */
function getStatisticsService(): StatisticsService {
  const db = getDatabase();
  return new StatisticsService(db);
}

/**
 * Query keys for cook sessions
 */
export const cookSessionKeys = {
  all: ['cook-sessions'] as const,
  forRecipe: (recipeId: string) => [...cookSessionKeys.all, 'recipe', recipeId] as const,
  stats: (recipeId: string) => [...cookSessionKeys.all, 'stats', recipeId] as const,
  detail: (id: string) => [...cookSessionKeys.all, 'detail', id] as const,
  personalStats: (period?: StatisticsDateRange) => [...cookSessionKeys.all, 'personal-stats', period?.start?.toISOString(), period?.end?.toISOString()] as const,
  yearInReview: (year: number) => [...cookSessionKeys.all, 'year-in-review', year] as const,
};

/**
 * Hook to fetch cook sessions for a recipe
 */
export function useCookSessions(recipeId: string | undefined) {
  return useQuery({
    queryKey: cookSessionKeys.forRecipe(recipeId ?? ''),
    queryFn: () => {
      if (!recipeId) return [];
      const service = getStatisticsService();
      return service.getCookSessionsForRecipe(recipeId);
    },
    enabled: !!recipeId,
  });
}

/**
 * Hook to fetch cook statistics for a recipe
 * Requirements: 23.6
 */
export function useCookStats(recipeId: string | undefined) {
  return useQuery({
    queryKey: cookSessionKeys.stats(recipeId ?? ''),
    queryFn: () => {
      if (!recipeId) return { timesCooked: 0 };
      const service = getStatisticsService();
      return service.getCookStats(recipeId);
    },
    enabled: !!recipeId,
  });
}

/**
 * Hook to log a cook session
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
 */
export function useLogCookSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CookSessionInput) => {
      const service = getStatisticsService();
      return service.logCookSession(input);
    },
    onSuccess: (session) => {
      // Invalidate cook sessions for this recipe
      queryClient.invalidateQueries({ queryKey: cookSessionKeys.forRecipe(session.recipeId) });
      // Invalidate cook stats for this recipe
      queryClient.invalidateQueries({ queryKey: cookSessionKeys.stats(session.recipeId) });
      // Invalidate recipe queries to update last cooked info
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      // Invalidate personal stats
      queryClient.invalidateQueries({ queryKey: ['cook-sessions', 'personal-stats'] });
      // Invalidate year in review
      queryClient.invalidateQueries({ queryKey: ['cook-sessions', 'year-in-review'] });
    },
  });
}

/**
 * Hook to fetch personal statistics
 * Requirements: 28.1, 28.2, 28.3, 28.4
 */
export function usePersonalStats(period?: StatisticsDateRange) {
  return useQuery({
    queryKey: cookSessionKeys.personalStats(period),
    queryFn: () => {
      const service = getStatisticsService();
      return service.getPersonalStats(period);
    },
  });
}

/**
 * Hook to fetch year in review statistics
 * Requirements: 29.1, 29.2, 29.3
 */
export function useYearInReview(year: number) {
  return useQuery({
    queryKey: cookSessionKeys.yearInReview(year),
    queryFn: () => {
      const service = getStatisticsService();
      return service.getYearInReview(year);
    },
  });
}
