/**
 * Statistics Service - Business logic for cook session tracking and recipe ratings
 *
 * Provides functionality for logging cook sessions, calculating statistics,
 * and managing recipe ratings.
 */
import type { Database } from '../db/database.js';
import type { CookSession, CookSessionInput, CookStats, RatingInput, RatingEntry, PersonalStats, YearInReview, StatisticsDateRange } from '../types/statistics.js';
/**
 * Options for filtering recipes by rating
 */
export interface RatingFilterOptions {
    /** Minimum rating to include (1-5) */
    minRating?: number;
    /** Sort order for results */
    sortBy?: 'rating' | 'ratedAt';
    /** Sort direction */
    sortOrder?: 'asc' | 'desc';
}
/**
 * Service for managing cook session statistics and recipe ratings
 */
export declare class StatisticsService {
    private db;
    constructor(db: Database);
    /**
     * Log a cook session for a recipe
     * Requirements: 12.1 - Record actual prep time and cook time
     */
    logCookSession(input: CookSessionInput): CookSession;
    /**
     * Get a cook session by ID
     */
    getCookSession(id: string): CookSession | undefined;
    /**
     * Get all cook sessions for a recipe
     */
    getCookSessionsForRecipe(recipeId: string): CookSession[];
    /**
     * Get cook statistics for a recipe
     * Requirements: 12.2 - Calculate and display statistics including average, min, max, range
     * Requirements: 12.4 - Display number of times cooked and date of last cook
     */
    getCookStats(recipeId: string): CookStats;
    /**
     * Rate a recipe
     * Requirements: 13.1 - Store rating on a scale of 1-5 stars
     */
    rateRecipe(input: RatingInput): RatingEntry;
    /**
     * Get the current (latest) rating for a recipe
     * Requirements: 13.2 - Display current rating if set
     */
    getCurrentRating(recipeId: string): number | undefined;
    /**
     * Get rating history for a recipe
     * Requirements: 13.5 - Track rating history to show how opinions change over time
     */
    getRatingHistory(recipeId: string): RatingEntry[];
    /**
     * Get all recipe IDs with their current ratings
     * Helper for filtering and sorting
     */
    getAllRecipeRatings(): Map<string, number>;
    /**
     * Get recipe IDs filtered by minimum rating
     * Requirements: 13.3 - Allow filtering by rating
     */
    getRecipeIdsByMinRating(minRating: number): string[];
    /**
     * Get recipe IDs sorted by rating
     * Requirements: 13.3 - Allow sorting by rating
     */
    getRecipeIdsSortedByRating(order?: 'asc' | 'desc'): string[];
    /**
     * Filter and sort recipe IDs by rating
     * Requirements: 13.3 - Allow filtering and sorting by rating
     */
    filterRecipesByRating(options: RatingFilterOptions): string[];
    /**
     * Get personal statistics for a period
     * Requirements: 14.1 - Track usage statistics including recipes cooked, total cook sessions
     * Requirements: 14.2 - Display total recipes cooked, most-cooked recipes, and favorite cuisines
     */
    getPersonalStats(period?: StatisticsDateRange): PersonalStats;
    /**
     * Get year in review statistics
     * Requirements: 14.3 - Generate a summary of cooking activity for the specified year
     */
    getYearInReview(year: number): YearInReview;
    /**
     * Calculate the longest consecutive days cooking streak in a date range
     */
    private calculateLongestStreak;
}
//# sourceMappingURL=statistics-service.d.ts.map