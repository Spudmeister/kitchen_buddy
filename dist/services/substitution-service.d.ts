/**
 * Substitution Service - Ingredient substitutions and recipe suggestions
 *
 * Provides functionality for suggesting ingredient alternatives with conversion
 * ratios and finding recipes based on available ingredients.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
import type { Database } from '../db/database.js';
import type { Recipe } from '../types/recipe.js';
import type { Unit } from '../types/units.js';
/**
 * A substitution suggestion for an ingredient
 */
export interface Substitution {
    /** Original ingredient name */
    original: string;
    /** Substitute ingredient name */
    substitute: string;
    /** Conversion ratio (multiply original quantity by this) */
    ratio: number;
    /** Unit for the substitute (may differ from original) */
    unit?: Unit;
    /** Notes about expected differences */
    notes?: string;
    /** Category of substitution */
    category: SubstitutionCategory;
}
/**
 * Category of substitution
 */
export type SubstitutionCategory = 'dairy' | 'egg' | 'flour' | 'sweetener' | 'fat' | 'protein' | 'liquid' | 'leavening' | 'spice' | 'other';
/**
 * A recipe suggestion with missing ingredient info
 */
export interface RecipeSuggestion {
    /** The suggested recipe */
    recipe: Recipe;
    /** Ingredients that are available */
    matchedIngredients: string[];
    /** Ingredients that are missing */
    missingIngredients: string[];
    /** Number of missing ingredients */
    missingCount: number;
    /** Match score (0-1, higher is better) */
    matchScore: number;
}
/**
 * Service for ingredient substitutions and recipe suggestions
 */
export declare class SubstitutionService {
    private db;
    private recipeService;
    constructor(db: Database);
    /**
     * Get substitution suggestions for an ingredient
     * Requirements: 7.1 - Provide alternative ingredients with conversion ratios
     * Requirements: 7.3 - Note expected differences
     */
    getSubstitutions(ingredientName: string): Substitution[];
    /**
     * Check if an ingredient has known substitutions
     */
    hasSubstitutions(ingredientName: string): boolean;
    /**
     * Get all available substitution categories
     */
    getSubstitutionCategories(): SubstitutionCategory[];
    /**
     * Suggest recipes based on available ingredients
     * Requirements: 7.2 - Suggest recipes that can be made with available ingredients
     * Requirements: 7.4 - Suggest recipes with minimal missing ingredients
     *
     * Property 17: For any set of available ingredients, suggested recipes SHALL be
     * makeable with those ingredients (possibly with some missing), and SHALL be
     * ordered by the number of missing ingredients (ascending).
     */
    suggestRecipesByIngredients(availableIngredients: string[], limit?: number): RecipeSuggestion[];
    /**
     * Find recipes that can be made with ONLY the available ingredients
     * (no missing ingredients)
     */
    findExactMatches(availableIngredients: string[]): Recipe[];
    /**
     * Find recipes with at most N missing ingredients
     */
    findWithMaxMissing(availableIngredients: string[], maxMissing: number, limit?: number): RecipeSuggestion[];
    /**
     * Get substitution suggestions for missing ingredients in a recipe
     */
    getSubstitutionsForRecipe(recipeId: string, availableIngredients: string[]): Map<string, Substitution[]>;
    /**
     * Normalize an ingredient name for matching
     */
    private normalizeIngredientName;
    /**
     * Check if two ingredient names match
     * Uses fuzzy matching to handle variations
     */
    private ingredientsMatch;
}
//# sourceMappingURL=substitution-service.d.ts.map