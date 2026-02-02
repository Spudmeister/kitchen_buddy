/**
 * Recommendation Service - Rule-based recipe recommendations
 *
 * Provides functionality for recommending recipes based on ratings,
 * cook frequency, and various filters.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.5
 */
import type { Database } from '../db/database.js';
import type { Recipe } from '../types/recipe.js';
import type { Duration } from '../types/units.js';
/**
 * Filters for recipe recommendations
 */
export interface RecommendationFilters {
    /** Maximum prep time */
    maxPrepTime?: Duration;
    /** Maximum cook time */
    maxCookTime?: Duration;
    /** Tags to include */
    tags?: string[];
    /** Tags to exclude */
    excludeTags?: string[];
    /** Minimum rating (1-5) */
    minRating?: number;
    /** Target servings */
    servings?: number;
    /** Available ingredients ("What can I make with...") */
    ingredients?: string[];
}
/**
 * Service for generating recipe recommendations
 */
export declare class RecommendationService {
    private db;
    private recipeService;
    private statsService;
    constructor(db: Database);
    /**
     * Get favorite recipes - highly rated AND frequently cooked
     * Requirements: 13.4, 15.2
     *
     * Property 27: For any request for favorites, the returned recipes SHALL have
     * high ratings (≥4 stars) AND high cook frequency (above median), sorted by
     * a combination of both factors.
     */
    getFavorites(limit?: number): Recipe[];
    /**
     * Get deep cuts - good ratings but rarely cooked
     * Requirements: 15.3
     *
     * Property 28: For any request for deep cuts, the returned recipes SHALL have
     * good ratings (≥3 stars) AND low cook frequency (below median or never cooked),
     * sorted by rating.
     */
    getDeepCuts(limit?: number): Recipe[];
    /**
     * Get recently added recipes
     * Requirements: 15.5
     */
    getRecentlyAdded(limit?: number): Recipe[];
    /**
     * Get recipes not cooked recently
     * Requirements: 15.5
     */
    getNotCookedRecently(limit?: number, daysSinceLastCook?: number): Recipe[];
    /**
     * Get recommendations with filters
     * Requirements: 15.1
     */
    getRecommendations(filters: RecommendationFilters, limit?: number): Recipe[];
    /**
     * Get cook counts for a list of recipe IDs
     */
    private getCookCountsForRecipes;
    /**
     * Get recipes by IDs, preserving order
     */
    private getRecipesByIds;
    /**
     * Filter recipe IDs by available ingredients
     * Returns recipes that can be made with the given ingredients
     * (ordered by number of missing ingredients)
     */
    private filterByIngredients;
}
//# sourceMappingURL=recommendation-service.d.ts.map