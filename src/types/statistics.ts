/**
 * Statistics-related types for Sous Chef
 */

import type { Duration } from './units.js';

/**
 * Input for logging a cook session
 */
export interface CookSessionInput {
  /** Recipe ID that was cooked */
  recipeId: string;
  /** Date of the cook session */
  date: Date;
  /** Actual prep time in minutes */
  actualPrepMinutes?: number;
  /** Actual cook time in minutes */
  actualCookMinutes?: number;
  /** Number of servings made */
  servingsMade: number;
  /** Optional notes about the session */
  notes?: string;
  /** Optional instance ID if linked to a recipe instance */
  instanceId?: string;
}

/**
 * A recorded cook session
 */
export interface CookSession {
  /** Unique identifier */
  id: string;
  /** Recipe ID that was cooked */
  recipeId: string;
  /** Date of the cook session */
  date: Date;
  /** Actual prep time */
  actualPrepTime?: Duration;
  /** Actual cook time */
  actualCookTime?: Duration;
  /** Number of servings made */
  servingsMade: number;
  /** Optional notes about the session */
  notes?: string;
  /** Optional instance ID if linked to a recipe instance */
  instanceId?: string;
}

/**
 * Statistics for a recipe's cook sessions
 */
export interface CookStats {
  /** Number of times the recipe has been cooked */
  timesCooked: number;
  /** Date of the last cook session */
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
 * Input for rating a recipe
 */
export interface RatingInput {
  /** Recipe ID to rate */
  recipeId: string;
  /** Rating value (1-5) */
  rating: number;
}

/**
 * A recorded rating entry
 */
export interface RatingEntry {
  /** Unique identifier */
  id: string;
  /** Recipe ID that was rated */
  recipeId: string;
  /** Rating value (1-5) */
  rating: number;
  /** When the rating was recorded */
  ratedAt: Date;
}

/**
 * Recipe count for statistics
 */
export interface RecipeCount {
  /** Recipe ID */
  recipeId: string;
  /** Number of times cooked */
  count: number;
}

/**
 * Tag count for statistics
 */
export interface TagCount {
  /** Tag name */
  tag: string;
  /** Number of times used */
  count: number;
}

/**
 * Date range for filtering statistics
 */
export interface StatisticsDateRange {
  /** Start date (inclusive) */
  start: Date;
  /** End date (inclusive) */
  end: Date;
}

/**
 * Personal statistics for a user
 * Requirements: 14.1, 14.2
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
 * Requirements: 14.3
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
