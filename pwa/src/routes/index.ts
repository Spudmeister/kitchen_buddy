/**
 * Route components are lazy loaded in App.tsx
 * This file provides route path constants for type-safe navigation
 */

/**
 * Application route paths
 * Use these constants for navigation to ensure type safety
 */
export const ROUTES = {
  // Main flows
  HOME: '/',
  PLAN: '/plan',
  SHOP: '/shop',
  COOK: '/cook',
  
  // Planning sub-routes
  BRAINSTORM: '/plan/brainstorm',
  SUE_CHAT: '/plan/sue',
  
  // Shopping sub-routes
  SHOPPING_LIST: (listId: string) => `/shop/${listId}`,
  
  // Cooking sub-routes
  MEAL_PREP: '/cook/prep',
  
  // Recipe routes
  RECIPE_NEW: '/recipe/new',
  RECIPE_IMPORT: '/recipe/import',
  RECIPE_DETAIL: (id: string) => `/recipe/${id}`,
  RECIPE_COOK: (id: string) => `/recipe/${id}/cook`,
  RECIPE_EDIT: (id: string) => `/recipe/${id}/edit`,
  RECIPE_HISTORY: (id: string) => `/recipe/${id}/history`,
  
  // Settings and stats
  SETTINGS: '/settings',
  SETTINGS_DATA: '/settings/data',
  STATS: '/stats',
  YEAR_IN_REVIEW: (year: number | string) => `/stats/year/${year}`,
  
  // Search
  SEARCH: '/search',
} as const;

/**
 * Type for route paths
 */
export type RoutePath = typeof ROUTES[keyof typeof ROUTES];
