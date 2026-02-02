/**
 * Statistics types for Sous Chef PWA
 * 
 * Types for cook sessions, ratings, and statistics tracking.
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.6, 28.1, 28.2, 28.3, 28.4, 29.1, 29.2, 29.3
 */

import type { Duration } from './units';

/**
 * Input for logging a cook session
 * Requirements: 23.1, 23.2, 23.3, 23.4
 */
export interface CookSessionInput {
  /** Recipe that was cooked */
  recipeId: string;
  /** Optional instance ID if using a saved configuration */
  instanceId?: string;
  /** Date of the cook session */
  date: Date;
  /** Actual prep time in minutes */
  actualPrepMinutes?: number;
  /** Actual cook time in minutes */
  actualCookMinutes?: number;
  /** Number of servings made */
  servingsMade: number;
  /** Notes about the cook session */
  notes?: string;
}

/**
 * A logged cook session
 * Requirements: 23.1, 23.2, 23.3, 23.4
 */
export interface CookSession {
  /** Unique identifier */
  id: string;
  /** Recipe that was cooked */
  recipeId: string;
  /** Date of the cook session */
  date: Date;
  /** Actual prep time */
  actualPrepTime?: Duration;
  /** Actual cook time */
  actualCookTime?: Duration;
  /** Number of servings made */
  servingsMade: number;
  /** Notes about the cook session */
  notes?: string;
  /** Instance ID if using a saved configuration */
  instanceId?: string;
}

/**
 * Cook statistics for a recipe
 * Requirements: 23.6
 */
export interface CookStats {
  /** Number of times the recipe has been cooked */
  timesCooked: number;
  /** Date of the last cook */
  lastCooked?: Date;
  /** Average prep time across all sessions */
  avgPrepTime?: Duration;
  /** Average cook time across all sessions */
  avgCookTime?: Duration;
  /** Minimum prep time recorded */
  minPrepTime?: Duration;
  /** Maximum prep time recorded */
  maxPrepTime?: Duration;
  /** Minimum cook time recorded */
  minCookTime?: Duration;
  /** Maximum cook time recorded */
  maxCookTime?: Duration;
}

/**
 * Rating entry for a recipe
 */
export interface RatingEntry {
  /** Unique identifier */
  id: string;
  /** Recipe ID */
  recipeId: string;
  /** Rating value (1-5) */
  rating: number;
  /** When the rating was given */
  ratedAt: Date;
}

/**
 * Recipe count for statistics
 * Requirements: 28.1, 28.2
 */
export interface RecipeCount {
  /** Recipe ID */
  recipeId: string;
  /** Number of times cooked */
  count: number;
}

/**
 * Tag count for statistics
 * Requirements: 28.2
 */
export interface TagCount {
  /** Tag name */
  tag: string;
  /** Number of times used */
  count: number;
}

/**
 * Date range for filtering statistics
 * Requirements: 28.3
 */
export interface StatisticsDateRange {
  /** Start date (inclusive) */
  start: Date;
  /** End date (inclusive) */
  end: Date;
}

/**
 * Personal statistics for a user
 * Requirements: 28.1, 28.2, 28.3, 28.4
 */
export interface PersonalStats {
  /** Total number of recipes in the collection */
  totalRecipes: number;
  /** Total number of cook sessions */
  totalCookSessions: number;
  /** Most frequently cooked recipes */
  mostCookedRecipes: RecipeCount[];
  /** Most frequently used tags */
  favoriteTags: TagCount[];
  /** Average number of cooks per week in the period */
  avgCooksPerWeek: number;
  /** Number of unique recipes cooked */
  uniqueRecipesCooked: number;
}

/**
 * Monthly activity statistics
 * Requirements: 29.2
 */
export interface MonthlyStats {
  /** Month (1-12) */
  month: number;
  /** Number of cook sessions */
  cookSessions: number;
  /** Number of unique recipes cooked */
  uniqueRecipes: number;
}

/**
 * Year in review statistics
 * Requirements: 29.1, 29.2, 29.3
 */
export interface YearInReview {
  /** Year being reviewed */
  year: number;
  /** Total cook sessions in the year */
  totalCookSessions: number;
  /** Number of unique recipes cooked */
  uniqueRecipesCooked: number;
  /** Number of new recipes added */
  newRecipesAdded: number;
  /** Top recipes by cook count */
  topRecipes: RecipeCount[];
  /** Top tags by usage */
  topTags: TagCount[];
  /** Monthly activity breakdown */
  monthlyActivity: MonthlyStats[];
  /** Longest consecutive days cooking streak */
  longestStreak: number;
  /** Total time spent cooking */
  totalTimeSpentCooking: Duration;
}
