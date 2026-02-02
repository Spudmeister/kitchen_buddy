/**
 * Menu Assistant Service (Sue) - AI-powered menu planning assistant
 *
 * Provides conversational menu planning with recipe suggestions,
 * constraint filtering, and variety management.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8
 * - 16.1: Available when AI features are enabled
 * - 16.2: Propose recipes based on stated preferences
 * - 16.3: Filter by dietary restrictions, time, ingredients
 * - 16.4: Avoid repeating cuisines/ingredients for variety
 * - 16.5: Add suggested recipes to menu
 * - 16.6: Provide alternatives meeting same criteria
 * - 16.7: Consider leftover utilization
 * - 16.8: Not available when AI disabled
 */
import type { Database } from '../db/database.js';
import type { Recipe } from '../types/recipe.js';
import type { Menu, MealSlot } from '../types/menu.js';
import type { ChatMessage, RecipeSuggestion, MenuConstraints, VarietyPreferences, MenuAssistantResponse, SuggestionAcceptResult } from '../types/menu-assistant.js';
/**
 * Menu Assistant Service - AI-powered menu planning assistant named "Sue"
 */
export declare class MenuAssistantService {
    private db;
    private aiService;
    private recipeService;
    private menuService;
    private recommendationService;
    private tagService;
    private context;
    constructor(db: Database);
    /**
     * Check if the Menu Assistant is available
     * Requirements: 16.1, 16.8 - Available only when AI is enabled
     */
    isAvailable(): Promise<boolean>;
    /**
     * Initialize the assistant with a menu context
     * @param menuId - Optional menu ID to work with
     */
    initialize(menuId?: string): Promise<void>;
    /**
     * Set the current menu being built
     */
    setCurrentMenu(menu: Menu): void;
    /**
     * Set constraints for suggestions
     * Requirements: 16.3 - Filter by dietary restrictions, time, ingredients
     */
    setConstraints(constraints: MenuConstraints): void;
    /**
     * Set variety preferences
     * Requirements: 16.4 - Avoid repeating cuisines/ingredients
     */
    setVarietyPreferences(preferences: VarietyPreferences): void;
    /**
     * Get current constraints
     */
    getConstraints(): MenuConstraints | undefined;
    /**
     * Filter recipes by current constraints
     * Requirements: 16.3 - Filter by dietary restrictions, time, ingredients
     *
     * @param limit - Maximum number of recipes to return
     * @returns Filtered recipes matching all constraints
     */
    filterRecipesByConstraints(limit?: number): Recipe[];
    /**
     * Filter recipes by specific constraints (without modifying context)
     * Requirements: 16.3 - Filter by dietary restrictions, time, ingredients
     *
     * @param constraints - Constraints to apply
     * @param limit - Maximum number of recipes to return
     * @returns Filtered recipes matching all constraints
     */
    filterRecipes(constraints: MenuConstraints, limit?: number): Recipe[];
    /**
     * Chat with the Menu Assistant
     * Requirements: 16.1, 16.2 - Conversational menu planning
     *
     * @param message - User's message
     * @returns Assistant's response with suggestions
     */
    chat(message: string): Promise<MenuAssistantResponse>;
    /**
     * Accept a recipe suggestion and add it to the menu
     * Requirements: 16.5 - Add suggested recipes to menu
     */
    acceptSuggestion(recipeId: string, date: Date, mealSlot: MealSlot, servings?: number): SuggestionAcceptResult;
    /**
     * Accept multiple recipe suggestions at once
     * Requirements: 16.5 - Add suggested recipes to menu
     *
     * @param suggestions - Array of suggestions to accept
     * @returns Results for each suggestion
     */
    acceptMultipleSuggestions(suggestions: Array<{
        recipeId: string;
        date: Date;
        mealSlot: MealSlot;
        servings?: number;
    }>): SuggestionAcceptResult[];
    /**
     * Accept a suggestion from the most recent response by index
     * Requirements: 16.5 - Add suggested recipes to menu
     *
     * @param suggestionIndex - Index of the suggestion (0-based)
     * @param date - Date to assign the recipe
     * @param mealSlot - Meal slot for the assignment
     * @param servings - Optional servings override
     * @returns Result of the acceptance
     */
    acceptSuggestionByIndex(suggestionIndex: number, date: Date, mealSlot: MealSlot, servings?: number): SuggestionAcceptResult;
    /**
     * Get the current menu being built
     */
    getCurrentMenu(): Menu | undefined;
    /**
     * Create a new menu and set it as current
     *
     * @param name - Menu name
     * @param startDate - Start date
     * @param endDate - End date
     * @returns The created menu
     */
    createAndSetMenu(name: string, startDate: Date, endDate: Date): Menu;
    /**
     * Get alternative suggestions meeting the same criteria
     * Requirements: 16.6 - Provide alternatives
     */
    getAlternatives(excludeRecipeIds: string[]): Promise<RecipeSuggestion[]>;
    /**
     * Get variety-focused suggestions that avoid repeating cuisines and main ingredients
     * Requirements: 16.4 - Avoid repeating cuisines/ingredients
     *
     * @param limit - Maximum number of suggestions to return
     * @returns Suggestions that maximize variety in the menu
     */
    getVarietySuggestions(limit?: number): RecipeSuggestion[];
    /**
     * Get cuisines currently used in the menu
     * Requirements: 16.4 - Track cuisines for variety
     */
    getUsedCuisines(): string[];
    /**
     * Get main ingredients currently used in the menu
     * Requirements: 16.4 - Track main ingredients for variety
     */
    getUsedMainIngredients(): string[];
    /**
     * Get available cuisines not yet used in the menu
     * Requirements: 16.4 - Suggest different cuisines for variety
     */
    getAvailableCuisines(): string[];
    /**
     * Generate reason for variety suggestion
     */
    private generateVarietyReason;
    /**
     * Calculate confidence for variety suggestion
     */
    private calculateVarietyConfidence; /**
     * Get the conversation history
     */
    getConversationHistory(): ChatMessage[];
    /**
     * Clear the conversation history
     */
    clearConversation(): void;
    /**
     * Analyze user message to understand intent
     */
    private analyzeIntent;
    /**
     * Get suggestions based on intent
     */
    private getSuggestionsForIntent;
    /**
     * Build recommendation filters from constraints
     */
    private buildFiltersFromConstraints;
    /**
     * Apply variety filter to avoid repeating cuisines/ingredients
     * Requirements: 16.4 - Avoid repeating cuisines/ingredients
     */
    private applyVarietyFilter;
    /**
     * Extract dietary tags from message
     */
    private extractDietaryTags;
    /**
     * Generate a reason for suggesting a recipe
     */
    private generateSuggestionReason;
    /**
     * Calculate confidence score for a suggestion
     */
    private calculateConfidence;
    /**
     * Build response using AI
     */
    private buildResponse;
    /**
     * Format assistant message with suggestions
     */
    private formatAssistantMessage;
    /**
     * Build fallback response when AI is unavailable
     */
    private buildFallbackResponse;
    /**
     * Generate follow-up questions based on intent
     */
    private generateFollowUpQuestions;
    /**
     * Format constraints for display
     */
    private formatConstraints;
    /**
     * Get all non-archived recipes
     */
    private getAllRecipes;
}
//# sourceMappingURL=menu-assistant-service.d.ts.map