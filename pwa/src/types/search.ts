/**
 * Search and filter types for Recipe Library
 * 
 * Requirements: 3.2, 3.3, 3.4
 */

/**
 * Sort options for recipe list
 */
export type RecipeSortOption = 
  | 'name'
  | 'rating'
  | 'date_added'
  | 'last_cooked'
  | 'cook_time';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Built-in dietary tags
 * Requirements: 3.7
 */
export const DIETARY_TAGS = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'low-carb',
] as const;

export type DietaryTag = typeof DIETARY_TAGS[number];

/**
 * Search filters for recipe library
 */
export interface RecipeFilters {
  /** Text search query */
  query?: string;
  /** Filter by tags (AND logic - recipe must have all tags) */
  tags?: string[];
  /** Minimum rating (1-5) */
  minRating?: number;
  /** Maximum total cook time in minutes */
  maxCookTime?: number;
  /** Filter by folder ID */
  folderId?: string;
  /** Include archived recipes */
  includeArchived?: boolean;
}

/**
 * Sort configuration
 */
export interface RecipeSort {
  field: RecipeSortOption;
  direction: SortDirection;
}

/**
 * Combined search parameters
 */
export interface RecipeSearchParams {
  filters?: RecipeFilters;
  sort?: RecipeSort;
  limit?: number;
  offset?: number;
}

/**
 * Search result with pagination info
 */
export interface RecipeSearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
