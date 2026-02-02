/**
 * React Query hooks for recipe recommendations
 *
 * Provides data fetching and caching for recommendation sections.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import { useQuery } from '@tanstack/react-query';
import { getDatabase } from '@db/browser-database';
import { RecommendationService } from '@services/recommendation-service';

/**
 * Get the recommendation service instance
 */
function getRecommendationService(): RecommendationService {
  const db = getDatabase();
  return new RecommendationService(db);
}

/**
 * Query keys for recommendations
 */
export const recommendationKeys = {
  all: ['recommendations'] as const,
  favorites: (limit?: number) => [...recommendationKeys.all, 'favorites', limit] as const,
  deepCuts: (limit?: number) => [...recommendationKeys.all, 'deep-cuts', limit] as const,
  recentlyAdded: (limit?: number) => [...recommendationKeys.all, 'recently-added', limit] as const,
  notCookedRecently: (limit?: number, days?: number) =>
    [...recommendationKeys.all, 'not-cooked-recently', limit, days] as const,
};

/**
 * Hook to fetch favorite recipes (highly-rated AND frequently-cooked)
 * Requirements: 14.1, 14.2
 */
export function useFavorites(limit: number = 10) {
  return useQuery({
    queryKey: recommendationKeys.favorites(limit),
    queryFn: () => {
      const service = getRecommendationService();
      return service.getFavorites(limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch deep cuts (well-rated but rarely-cooked)
 * Requirements: 14.3
 */
export function useDeepCuts(limit: number = 10) {
  return useQuery({
    queryKey: recommendationKeys.deepCuts(limit),
    queryFn: () => {
      const service = getRecommendationService();
      return service.getDeepCuts(limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch recently added recipes
 * Requirements: 14.4
 */
export function useRecentlyAdded(limit: number = 10) {
  return useQuery({
    queryKey: recommendationKeys.recentlyAdded(limit),
    queryFn: () => {
      const service = getRecommendationService();
      return service.getRecentlyAdded(limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch recipes not cooked recently ("Haven't Made Lately")
 * Requirements: 14.5
 */
export function useNotCookedRecently(limit: number = 10, daysSinceLastCook: number = 30) {
  return useQuery({
    queryKey: recommendationKeys.notCookedRecently(limit, daysSinceLastCook),
    queryFn: () => {
      const service = getRecommendationService();
      return service.getNotCookedRecently(limit, daysSinceLastCook);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
