/**
 * Tag Service - Business logic for recipe tagging
 *
 * Provides tag management operations for recipes.
 * Requirements: 3.1, 3.4, 3.7
 */
import type { Database } from '../db/database.js';
import type { Recipe, Ingredient } from '../types/recipe.js';
/**
 * Tag count information
 */
export interface TagCount {
    /** Tag name */
    name: string;
    /** Number of recipes with this tag */
    count: number;
}
/**
 * Dietary tag types
 * Requirements: 3.7 - Built-in dietary categories
 */
export type DietaryTag = 'vegan' | 'vegetarian' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'low-carb';
/**
 * All dietary tags
 */
export declare const DIETARY_TAGS: DietaryTag[];
/**
 * Service for managing recipe tags
 */
export declare class TagService {
    private db;
    constructor(db: Database);
    /**
     * Add a tag to a recipe
     * Requirements: 3.1 - Associate tags with recipes
     */
    addTag(recipeId: string, tagName: string): void;
    /**
     * Remove a tag from a recipe
     * Requirements: 3.1 - Manage tag associations
     */
    removeTag(recipeId: string, tagName: string): void;
    /**
     * Get all recipes with a specific tag
     * Requirements: 3.4 - Return all recipes matching specified tags
     */
    getRecipesByTag(tagName: string): Recipe[];
    /**
     * Get all tags with their recipe counts
     * Requirements: 3.4 - Support tag-based search
     */
    getAllTags(): TagCount[];
    /**
     * Get tags for a specific recipe
     */
    getTagsForRecipe(recipeId: string): string[];
    /**
     * Check if a recipe has a specific tag
     */
    hasTag(recipeId: string, tagName: string): boolean;
    /**
     * Remove orphaned tags (tags with no recipe associations)
     */
    private cleanupOrphanedTags;
    /**
     * Load a recipe by ID (helper method)
     */
    private loadRecipe;
    /**
     * Detect dietary tags based on ingredient analysis
     * Requirements: 3.7 - Built-in dietary categories
     *
     * Analyzes ingredients to determine which dietary tags apply.
     * Returns tags that the recipe qualifies for (e.g., vegan, gluten-free).
     */
    detectDietaryTags(ingredients: Ingredient[]): DietaryTag[];
    /**
     * Check if any ingredient name contains any of the keywords
     */
    private containsAny;
}
/**
 * Tag suggestion from AI
 * Requirements: 3.2, 3.3 - AI-powered tag suggestions with confidence
 */
export interface TagSuggestion {
    /** Suggested tag name */
    tag: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Reason for the suggestion */
    reason: string;
}
/**
 * AI Service interface for tag suggestions
 */
export interface AITagService {
    isEnabled(): boolean;
    suggestTags(recipe: Recipe): Promise<TagSuggestion[]>;
}
/**
 * Extended Tag Service with AI support
 * Requirements: 3.2, 3.3 - AI-powered tag suggestions
 */
export declare class AITagService extends TagService {
    private aiService?;
    constructor(db: Database, aiService?: AITagService);
    /**
     * Set the AI service for tag suggestions
     */
    setAIService(aiService: AITagService): void;
    /**
     * Apply suggested tags to a recipe after user confirmation
     * Requirements: 3.3 - Present auto-tags for user confirmation before applying
     *
     * @param recipeId - Recipe ID to apply tags to
     * @param suggestions - Tag suggestions to apply
     * @param minConfidence - Minimum confidence threshold (default: 0.7)
     */
    applySuggestedTags(recipeId: string, suggestions: TagSuggestion[], minConfidence?: number): void;
}
//# sourceMappingURL=tag-service.d.ts.map