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

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type { Recipe } from '../types/recipe.js';
import type { Menu, MealSlot } from '../types/menu.js';
import type {
  ChatMessage,
  RecipeSuggestion,
  MenuConstraints,
  VarietyPreferences,
  MenuAssistantContext,
  MenuAssistantResponse,
  SuggestionAcceptResult,
} from '../types/menu-assistant.js';
import { AIService } from './ai-service.js';
import { RecipeService } from './recipe-service.js';
import { MenuService } from './menu-service.js';
import { RecommendationService, type RecommendationFilters } from './recommendation-service.js';
import { TagService } from './tag-service.js';


/**
 * Common cuisine tags for variety detection
 */
const CUISINE_TAGS = [
  'italian', 'mexican', 'asian', 'chinese', 'japanese', 'thai', 'indian',
  'french', 'greek', 'mediterranean', 'american', 'southern', 'cajun',
  'korean', 'vietnamese', 'middle-eastern', 'spanish', 'german', 'british',
];

/**
 * Common main ingredient categories for variety detection
 */
const MAIN_INGREDIENT_CATEGORIES = [
  'chicken', 'beef', 'pork', 'fish', 'seafood', 'tofu', 'lamb',
  'turkey', 'duck', 'shrimp', 'salmon', 'pasta', 'rice', 'beans',
];

/**
 * Menu Assistant Service - AI-powered menu planning assistant named "Sue"
 */
export class MenuAssistantService {
  private aiService: AIService;
  private recipeService: RecipeService;
  private menuService: MenuService;
  private recommendationService: RecommendationService;
  private tagService: TagService;
  private context: MenuAssistantContext;

  constructor(private db: Database) {
    this.aiService = new AIService(db);
    this.recipeService = new RecipeService(db);
    this.menuService = new MenuService(db);
    this.recommendationService = new RecommendationService(db);
    this.tagService = new TagService(db);
    this.context = {
      conversationHistory: [],
      recentlySuggested: [],
    };
  }

  /**
   * Check if the Menu Assistant is available
   * Requirements: 16.1, 16.8 - Available only when AI is enabled
   */
  async isAvailable(): Promise<boolean> {
    await this.aiService.loadConfig();
    return this.aiService.isEnabled();
  }

  /**
   * Initialize the assistant with a menu context
   * @param menuId - Optional menu ID to work with
   */
  async initialize(menuId?: string): Promise<void> {
    await this.aiService.loadConfig();
    
    if (menuId) {
      const menu = this.menuService.getMenu(menuId);
      if (menu) {
        this.context.currentMenu = menu;
      }
    }
    
    // Reset conversation
    this.context.conversationHistory = [];
    this.context.recentlySuggested = [];
  }

  /**
   * Set the current menu being built
   */
  setCurrentMenu(menu: Menu): void {
    this.context.currentMenu = menu;
  }

  /**
   * Set constraints for suggestions
   * Requirements: 16.3 - Filter by dietary restrictions, time, ingredients
   */
  setConstraints(constraints: MenuConstraints): void {
    this.context.constraints = constraints;
  }

  /**
   * Set variety preferences
   * Requirements: 16.4 - Avoid repeating cuisines/ingredients
   */
  setVarietyPreferences(preferences: VarietyPreferences): void {
    this.context.varietyPreferences = preferences;
  }

  /**
   * Get current constraints
   */
  getConstraints(): MenuConstraints | undefined {
    return this.context.constraints;
  }

  /**
   * Filter recipes by current constraints
   * Requirements: 16.3 - Filter by dietary restrictions, time, ingredients
   * 
   * @param limit - Maximum number of recipes to return
   * @returns Filtered recipes matching all constraints
   */
  filterRecipesByConstraints(limit: number = 10): Recipe[] {
    const filters = this.buildFiltersFromConstraints();
    return this.recommendationService.getRecommendations(filters, limit);
  }

  /**
   * Filter recipes by specific constraints (without modifying context)
   * Requirements: 16.3 - Filter by dietary restrictions, time, ingredients
   * 
   * @param constraints - Constraints to apply
   * @param limit - Maximum number of recipes to return
   * @returns Filtered recipes matching all constraints
   */
  filterRecipes(constraints: MenuConstraints, limit: number = 10): Recipe[] {
    const filters: RecommendationFilters = {};

    if (constraints.maxPrepTime) {
      filters.maxPrepTime = { minutes: constraints.maxPrepTime };
    }
    if (constraints.maxCookTime) {
      filters.maxCookTime = { minutes: constraints.maxCookTime };
    }
    if (constraints.maxTotalTime) {
      // Apply to both prep and cook time as approximation
      const halfTime = Math.floor(constraints.maxTotalTime / 2);
      filters.maxPrepTime = filters.maxPrepTime || { minutes: halfTime };
      filters.maxCookTime = filters.maxCookTime || { minutes: halfTime };
    }
    if (constraints.includeTags && constraints.includeTags.length > 0) {
      filters.tags = constraints.includeTags;
    }
    if (constraints.excludeTags && constraints.excludeTags.length > 0) {
      filters.excludeTags = constraints.excludeTags;
    }
    if (constraints.dietaryRestrictions && constraints.dietaryRestrictions.length > 0) {
      filters.tags = [...(filters.tags || []), ...constraints.dietaryRestrictions];
    }
    if (constraints.minRating) {
      filters.minRating = constraints.minRating;
    }
    if (constraints.availableIngredients && constraints.availableIngredients.length > 0) {
      filters.ingredients = constraints.availableIngredients;
    }
    if (constraints.servings) {
      filters.servings = constraints.servings;
    }

    let recipes = this.recommendationService.getRecommendations(filters, limit * 2);

    // Post-filter by excluded ingredients
    if (constraints.excludeIngredients && constraints.excludeIngredients.length > 0) {
      const excludeLower = constraints.excludeIngredients.map(i => i.toLowerCase());
      recipes = recipes.filter(recipe => {
        return !recipe.ingredients.some(ing => 
          excludeLower.some(excl => ing.name.toLowerCase().includes(excl))
        );
      });
    }

    return recipes.slice(0, limit);
  }

  /**
   * Chat with the Menu Assistant
   * Requirements: 16.1, 16.2 - Conversational menu planning
   * 
   * @param message - User's message
   * @returns Assistant's response with suggestions
   */
  async chat(message: string): Promise<MenuAssistantResponse> {
    if (!await this.isAvailable()) {
      throw new Error('Menu Assistant is not available. Please enable AI features first.');
    }

    // Add user message to history
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    this.context.conversationHistory.push(userMessage);

    // Analyze the message to understand intent
    const intent = this.analyzeIntent(message);

    // Get recipe suggestions based on intent and constraints
    const suggestions = await this.getSuggestionsForIntent(intent, message);

    // Build response using AI
    const response = await this.buildResponse(message, suggestions, intent);

    // Add assistant message to history
    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: response.message,
      timestamp: new Date(),
      suggestions: response.suggestions,
    };
    this.context.conversationHistory.push(assistantMessage);

    // Track suggested recipes
    for (const suggestion of response.suggestions) {
      if (!this.context.recentlySuggested.includes(suggestion.recipe.id)) {
        this.context.recentlySuggested.push(suggestion.recipe.id);
      }
    }

    return response;
  }

  /**
   * Accept a recipe suggestion and add it to the menu
   * Requirements: 16.5 - Add suggested recipes to menu
   */
  acceptSuggestion(
    recipeId: string,
    date: Date,
    mealSlot: MealSlot,
    servings?: number
  ): SuggestionAcceptResult {
    if (!this.context.currentMenu) {
      return {
        success: false,
        error: 'No menu is currently being built. Please create or select a menu first.',
      };
    }

    try {
      const assignment = this.menuService.assignRecipe(this.context.currentMenu.id, {
        recipeId,
        date,
        mealSlot,
        servings,
      });

      // Refresh menu context
      this.context.currentMenu = this.menuService.getMenu(this.context.currentMenu.id);

      return {
        success: true,
        assignmentId: assignment.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add recipe to menu',
      };
    }
  }

  /**
   * Accept multiple recipe suggestions at once
   * Requirements: 16.5 - Add suggested recipes to menu
   * 
   * @param suggestions - Array of suggestions to accept
   * @returns Results for each suggestion
   */
  acceptMultipleSuggestions(
    suggestions: Array<{
      recipeId: string;
      date: Date;
      mealSlot: MealSlot;
      servings?: number;
    }>
  ): SuggestionAcceptResult[] {
    return suggestions.map(suggestion => 
      this.acceptSuggestion(
        suggestion.recipeId,
        suggestion.date,
        suggestion.mealSlot,
        suggestion.servings
      )
    );
  }

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
  acceptSuggestionByIndex(
    suggestionIndex: number,
    date: Date,
    mealSlot: MealSlot,
    servings?: number
  ): SuggestionAcceptResult {
    // Find the most recent assistant message with suggestions
    const assistantMessages = this.context.conversationHistory
      .filter(m => m.role === 'assistant' && m.suggestions && m.suggestions.length > 0)
      .reverse();

    if (assistantMessages.length === 0) {
      return {
        success: false,
        error: 'No suggestions available. Please ask for suggestions first.',
      };
    }

    const latestSuggestions = assistantMessages[0]!.suggestions!;
    
    if (suggestionIndex < 0 || suggestionIndex >= latestSuggestions.length) {
      return {
        success: false,
        error: `Invalid suggestion index. Please choose a number between 1 and ${latestSuggestions.length}.`,
      };
    }

    const suggestion = latestSuggestions[suggestionIndex]!;
    return this.acceptSuggestion(
      suggestion.recipe.id,
      date,
      mealSlot,
      servings
    );
  }

  /**
   * Get the current menu being built
   */
  getCurrentMenu(): Menu | undefined {
    return this.context.currentMenu;
  }

  /**
   * Create a new menu and set it as current
   * 
   * @param name - Menu name
   * @param startDate - Start date
   * @param endDate - End date
   * @returns The created menu
   */
  createAndSetMenu(name: string, startDate: Date, endDate: Date): Menu {
    const menu = this.menuService.createMenu({ name, startDate, endDate });
    this.context.currentMenu = menu;
    return menu;
  }

  /**
   * Get alternative suggestions meeting the same criteria
   * Requirements: 16.6 - Provide alternatives
   */
  async getAlternatives(excludeRecipeIds: string[]): Promise<RecipeSuggestion[]> {
    const filters = this.buildFiltersFromConstraints();
    
    // Get more recipes than needed to filter out excluded ones
    const recipes = this.recommendationService.getRecommendations(filters, 20);
    
    // Filter out excluded recipes and recently suggested
    const filtered = recipes.filter(r => 
      !excludeRecipeIds.includes(r.id) &&
      !this.context.recentlySuggested.includes(r.id)
    );

    // Apply variety filtering
    const varied = this.applyVarietyFilter(filtered);

    return varied.slice(0, 5).map(recipe => ({
      recipe,
      reason: this.generateSuggestionReason(recipe),
      confidence: 0.7,
    }));
  }

  /**
   * Get variety-focused suggestions that avoid repeating cuisines and main ingredients
   * Requirements: 16.4 - Avoid repeating cuisines/ingredients
   * 
   * @param limit - Maximum number of suggestions to return
   * @returns Suggestions that maximize variety in the menu
   */
  getVarietySuggestions(limit: number = 5): RecipeSuggestion[] {
    const filters = this.buildFiltersFromConstraints();
    
    // Get a larger pool of recipes to filter
    const recipes = this.recommendationService.getRecommendations(filters, limit * 4);
    
    // Apply variety filtering
    const varied = this.applyVarietyFilter(recipes);
    
    // If we don't have enough varied recipes, include some that may repeat
    let result = varied;
    if (result.length < limit) {
      const remaining = recipes.filter(r => !varied.some(v => v.id === r.id));
      result = [...varied, ...remaining.slice(0, limit - varied.length)];
    }

    return result.slice(0, limit).map(recipe => ({
      recipe,
      reason: this.generateVarietyReason(recipe),
      confidence: this.calculateVarietyConfidence(recipe),
    }));
  }

  /**
   * Get cuisines currently used in the menu
   * Requirements: 16.4 - Track cuisines for variety
   */
  getUsedCuisines(): string[] {
    if (!this.context.currentMenu) {
      return [];
    }

    const cuisines = new Set<string>();
    for (const assignment of this.context.currentMenu.assignments) {
      const recipe = this.recipeService.getRecipe(assignment.recipeId);
      if (recipe) {
        for (const tag of recipe.tags) {
          if (CUISINE_TAGS.includes(tag.toLowerCase())) {
            cuisines.add(tag.toLowerCase());
          }
        }
      }
    }

    return Array.from(cuisines);
  }

  /**
   * Get main ingredients currently used in the menu
   * Requirements: 16.4 - Track main ingredients for variety
   */
  getUsedMainIngredients(): string[] {
    if (!this.context.currentMenu) {
      return [];
    }

    const ingredients = new Set<string>();
    for (const assignment of this.context.currentMenu.assignments) {
      const recipe = this.recipeService.getRecipe(assignment.recipeId);
      if (recipe) {
        for (const ingredient of recipe.ingredients) {
          const ingredientLower = ingredient.name.toLowerCase();
          for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
            if (ingredientLower.includes(mainIngredient)) {
              ingredients.add(mainIngredient);
            }
          }
        }
      }
    }

    return Array.from(ingredients);
  }

  /**
   * Get available cuisines not yet used in the menu
   * Requirements: 16.4 - Suggest different cuisines for variety
   */
  getAvailableCuisines(): string[] {
    const usedCuisines = new Set(this.getUsedCuisines());
    return CUISINE_TAGS.filter(c => !usedCuisines.has(c));
  }

  /**
   * Generate reason for variety suggestion
   */
  private generateVarietyReason(recipe: Recipe): string {
    const usedCuisines = new Set(this.getUsedCuisines());
    const usedIngredients = new Set(this.getUsedMainIngredients());

    const reasons: string[] = [];

    // Check for new cuisine
    const recipeCuisines = recipe.tags.filter(t => CUISINE_TAGS.includes(t.toLowerCase()));
    const newCuisines = recipeCuisines.filter(c => !usedCuisines.has(c.toLowerCase()));
    if (newCuisines.length > 0) {
      reasons.push(`adds ${newCuisines[0]} cuisine`);
    }

    // Check for new main ingredient
    for (const ingredient of recipe.ingredients) {
      const ingredientLower = ingredient.name.toLowerCase();
      for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
        if (ingredientLower.includes(mainIngredient) && !usedIngredients.has(mainIngredient)) {
          reasons.push(`features ${mainIngredient}`);
          break;
        }
      }
      if (reasons.length >= 2) break;
    }

    if (reasons.length === 0) {
      return 'adds variety to your menu';
    }

    return reasons.join(', ');
  }

  /**
   * Calculate confidence for variety suggestion
   */
  private calculateVarietyConfidence(recipe: Recipe): number {
    const usedCuisines = new Set(this.getUsedCuisines());
    const usedIngredients = new Set(this.getUsedMainIngredients());

    let confidence = 0.5;

    // Boost for new cuisine
    const recipeCuisines = recipe.tags.filter(t => CUISINE_TAGS.includes(t.toLowerCase()));
    const hasNewCuisine = recipeCuisines.some(c => !usedCuisines.has(c.toLowerCase()));
    if (hasNewCuisine) {
      confidence += 0.2;
    }

    // Boost for new main ingredient
    let hasNewMainIngredient = false;
    for (const ingredient of recipe.ingredients) {
      const ingredientLower = ingredient.name.toLowerCase();
      for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
        if (ingredientLower.includes(mainIngredient) && !usedIngredients.has(mainIngredient)) {
          hasNewMainIngredient = true;
          break;
        }
      }
      if (hasNewMainIngredient) break;
    }
    if (hasNewMainIngredient) {
      confidence += 0.2;
    }

    // Boost for rating
    if (recipe.rating && recipe.rating >= 4) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }  /**
   * Get the conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.context.conversationHistory];
  }

  /**
   * Clear the conversation history
   */
  clearConversation(): void {
    this.context.conversationHistory = [];
    this.context.recentlySuggested = [];
  }

  // Private helper methods

  /**
   * Analyze user message to understand intent
   */
  private analyzeIntent(message: string): MessageIntent {
    const lowerMessage = message.toLowerCase();

    // Check for specific intents
    if (lowerMessage.includes('suggest') || lowerMessage.includes('recommend') || 
        lowerMessage.includes('what should') || lowerMessage.includes('ideas')) {
      return 'request_suggestions';
    }

    if (lowerMessage.includes('alternative') || lowerMessage.includes('something else') ||
        lowerMessage.includes('different')) {
      return 'request_alternatives';
    }

    if (lowerMessage.includes('quick') || lowerMessage.includes('fast') ||
        lowerMessage.includes('30 minute') || lowerMessage.includes('easy')) {
      return 'request_quick_meals';
    }

    if (lowerMessage.includes('vegetarian') || lowerMessage.includes('vegan') ||
        lowerMessage.includes('gluten-free') || lowerMessage.includes('healthy')) {
      return 'request_dietary';
    }

    if (lowerMessage.includes('leftover') || lowerMessage.includes('use up')) {
      return 'request_leftover_ideas';
    }

    if (lowerMessage.includes('variety') || lowerMessage.includes('different cuisine')) {
      return 'request_variety';
    }

    return 'general_chat';
  }

  /**
   * Get suggestions based on intent
   */
  private async getSuggestionsForIntent(
    intent: MessageIntent,
    message: string
  ): Promise<RecipeSuggestion[]> {
    const filters = this.buildFiltersFromConstraints();
    let recipes: Recipe[] = [];

    switch (intent) {
      case 'request_quick_meals':
        filters.maxPrepTime = { minutes: 15 };
        filters.maxCookTime = { minutes: 30 };
        recipes = this.recommendationService.getRecommendations(filters, 10);
        break;

      case 'request_dietary':
        // Extract dietary tags from message
        const dietaryTags = this.extractDietaryTags(message);
        if (dietaryTags.length > 0) {
          filters.tags = dietaryTags;
        }
        recipes = this.recommendationService.getRecommendations(filters, 10);
        break;

      case 'request_leftover_ideas':
        // Suggest recipes that use common leftover ingredients
        recipes = this.recommendationService.getRecommendations(filters, 10);
        break;

      case 'request_variety':
        recipes = this.recommendationService.getRecommendations(filters, 20);
        recipes = this.applyVarietyFilter(recipes);
        break;

      case 'request_alternatives':
        recipes = this.recommendationService.getRecommendations(filters, 20);
        // Filter out recently suggested
        recipes = recipes.filter(r => !this.context.recentlySuggested.includes(r.id));
        break;

      case 'request_suggestions':
      case 'general_chat':
      default:
        // Get a mix of favorites and recommendations
        const favorites = this.recommendationService.getFavorites(5);
        const recommendations = this.recommendationService.getRecommendations(filters, 10);
        recipes = [...favorites, ...recommendations];
        // Remove duplicates
        const seen = new Set<string>();
        recipes = recipes.filter(r => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
        break;
    }

    // Apply variety filter
    recipes = this.applyVarietyFilter(recipes);

    // Convert to suggestions
    return recipes.slice(0, 5).map(recipe => ({
      recipe,
      reason: this.generateSuggestionReason(recipe),
      confidence: this.calculateConfidence(recipe, intent),
    }));
  }

  /**
   * Build recommendation filters from constraints
   */
  private buildFiltersFromConstraints(): RecommendationFilters {
    const filters: RecommendationFilters = {};
    const constraints = this.context.constraints;

    if (constraints) {
      if (constraints.maxPrepTime) {
        filters.maxPrepTime = { minutes: constraints.maxPrepTime };
      }
      if (constraints.maxCookTime) {
        filters.maxCookTime = { minutes: constraints.maxCookTime };
      }
      if (constraints.includeTags && constraints.includeTags.length > 0) {
        filters.tags = constraints.includeTags;
      }
      if (constraints.excludeTags && constraints.excludeTags.length > 0) {
        filters.excludeTags = constraints.excludeTags;
      }
      if (constraints.dietaryRestrictions && constraints.dietaryRestrictions.length > 0) {
        filters.tags = [...(filters.tags || []), ...constraints.dietaryRestrictions];
      }
      if (constraints.minRating) {
        filters.minRating = constraints.minRating;
      }
      if (constraints.availableIngredients && constraints.availableIngredients.length > 0) {
        filters.ingredients = constraints.availableIngredients;
      }
      if (constraints.servings) {
        filters.servings = constraints.servings;
      }
    }

    return filters;
  }

  /**
   * Apply variety filter to avoid repeating cuisines/ingredients
   * Requirements: 16.4 - Avoid repeating cuisines/ingredients
   */
  private applyVarietyFilter(recipes: Recipe[]): Recipe[] {
    if (!this.context.currentMenu || this.context.currentMenu.assignments.length === 0) {
      return recipes;
    }

    const preferences = this.context.varietyPreferences;
    const menuRecipeIds = this.context.currentMenu.assignments.map(a => a.recipeId);
    
    // Get cuisines and main ingredients already in menu
    const usedCuisines = new Set<string>();
    const usedMainIngredients = new Set<string>();

    for (const recipeId of menuRecipeIds) {
      const recipe = this.recipeService.getRecipe(recipeId);
      if (recipe) {
        // Extract cuisines from tags
        for (const tag of recipe.tags) {
          if (CUISINE_TAGS.includes(tag.toLowerCase())) {
            usedCuisines.add(tag.toLowerCase());
          }
        }
        // Extract main ingredients
        for (const ingredient of recipe.ingredients) {
          const ingredientLower = ingredient.name.toLowerCase();
          for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
            if (ingredientLower.includes(mainIngredient)) {
              usedMainIngredients.add(mainIngredient);
            }
          }
        }
      }
    }

    // Add user-specified avoidances
    if (preferences?.avoidCuisines) {
      for (const cuisine of preferences.avoidCuisines) {
        usedCuisines.add(cuisine.toLowerCase());
      }
    }
    if (preferences?.avoidMainIngredients) {
      for (const ingredient of preferences.avoidMainIngredients) {
        usedMainIngredients.add(ingredient.toLowerCase());
      }
    }

    // Filter recipes
    return recipes.filter(recipe => {
      // Check cuisines
      const recipeCuisines = recipe.tags.filter(t => CUISINE_TAGS.includes(t.toLowerCase()));
      const hasSameCuisine = recipeCuisines.some(c => usedCuisines.has(c.toLowerCase()));
      
      // Check main ingredients
      let hasSameMainIngredient = false;
      for (const ingredient of recipe.ingredients) {
        const ingredientLower = ingredient.name.toLowerCase();
        for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
          if (ingredientLower.includes(mainIngredient) && usedMainIngredients.has(mainIngredient)) {
            hasSameMainIngredient = true;
            break;
          }
        }
        if (hasSameMainIngredient) break;
      }

      // Prefer recipes that don't repeat cuisines or main ingredients
      // But don't completely exclude them if we have limited options
      return !hasSameCuisine || !hasSameMainIngredient;
    });
  }

  /**
   * Extract dietary tags from message
   */
  private extractDietaryTags(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const tags: string[] = [];

    const dietaryKeywords: Record<string, string> = {
      'vegetarian': 'vegetarian',
      'vegan': 'vegan',
      'gluten-free': 'gluten-free',
      'gluten free': 'gluten-free',
      'dairy-free': 'dairy-free',
      'dairy free': 'dairy-free',
      'nut-free': 'nut-free',
      'nut free': 'nut-free',
      'low-carb': 'low-carb',
      'low carb': 'low-carb',
      'keto': 'low-carb',
      'healthy': 'healthy',
    };

    for (const [keyword, tag] of Object.entries(dietaryKeywords)) {
      if (lowerMessage.includes(keyword)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * Generate a reason for suggesting a recipe
   */
  private generateSuggestionReason(recipe: Recipe): string {
    const reasons: string[] = [];

    // Check rating
    if (recipe.rating && recipe.rating >= 4) {
      reasons.push('highly rated');
    }

    // Check time
    const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
    if (totalTime <= 30) {
      reasons.push('quick to make');
    } else if (totalTime <= 45) {
      reasons.push('reasonable cooking time');
    }

    // Check tags
    const cuisineTags = recipe.tags.filter(t => CUISINE_TAGS.includes(t.toLowerCase()));
    if (cuisineTags.length > 0) {
      reasons.push(`${cuisineTags[0]} cuisine`);
    }

    // Check dietary tags
    const dietaryTags = recipe.tags.filter(t => 
      ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'healthy'].includes(t.toLowerCase())
    );
    if (dietaryTags.length > 0) {
      reasons.push(dietaryTags.join(', '));
    }

    if (reasons.length === 0) {
      return 'matches your preferences';
    }

    return reasons.join(', ');
  }

  /**
   * Calculate confidence score for a suggestion
   */
  private calculateConfidence(recipe: Recipe, intent: MessageIntent): number {
    let confidence = 0.5;

    // Boost for rating
    if (recipe.rating) {
      confidence += (recipe.rating - 3) * 0.1;
    }

    // Boost for matching intent
    const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
    if (intent === 'request_quick_meals' && totalTime <= 30) {
      confidence += 0.2;
    }

    // Boost for dietary match
    if (intent === 'request_dietary') {
      const hasDietaryTags = recipe.tags.some(t => 
        ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'healthy'].includes(t.toLowerCase())
      );
      if (hasDietaryTags) {
        confidence += 0.2;
      }
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Build response using AI
   */
  private async buildResponse(
    userMessage: string,
    suggestions: RecipeSuggestion[],
    intent: MessageIntent
  ): Promise<MenuAssistantResponse> {
    // Build context for AI
    const recipeList = suggestions
      .map((s, i) => `${i + 1}. ${s.recipe.title} - ${s.reason}`)
      .join('\n');

    const menuInfo = this.context.currentMenu
      ? `Current menu: ${this.context.currentMenu.name} (${this.context.currentMenu.startDate.toDateString()} - ${this.context.currentMenu.endDate.toDateString()}) with ${this.context.currentMenu.assignments.length} recipes assigned.`
      : 'No menu currently being built.';

    const constraintInfo = this.context.constraints
      ? this.formatConstraints(this.context.constraints)
      : 'No specific constraints set.';

    // Get all recipes for context
    const allRecipes = this.getAllRecipes();

    try {
      const aiResponse = await this.aiService.chat(userMessage, {
        recipes: allRecipes,
        currentMenu: this.context.currentMenu ? {
          id: this.context.currentMenu.id,
          name: this.context.currentMenu.name,
          startDate: this.context.currentMenu.startDate,
          endDate: this.context.currentMenu.endDate,
        } : undefined,
        preferences: {
          dietaryRestrictions: this.context.constraints?.dietaryRestrictions,
        },
      });

      // Parse AI response and combine with suggestions
      return {
        message: this.formatAssistantMessage(aiResponse, suggestions),
        suggestions,
        needsClarification: intent === 'general_chat' && suggestions.length === 0,
        followUpQuestions: this.generateFollowUpQuestions(intent),
      };
    } catch {
      // Fallback to rule-based response if AI fails
      return this.buildFallbackResponse(suggestions, intent);
    }
  }

  /**
   * Format assistant message with suggestions
   */
  private formatAssistantMessage(aiResponse: string, suggestions: RecipeSuggestion[]): string {
    if (suggestions.length === 0) {
      return aiResponse || "I'd be happy to help you plan your menu! What kind of meals are you looking for?";
    }

    // If AI response is good, use it
    if (aiResponse && aiResponse.length > 20) {
      return aiResponse;
    }

    // Otherwise, build a structured response
    const suggestionList = suggestions
      .map((s, i) => `${i + 1}. **${s.recipe.title}** - ${s.reason}`)
      .join('\n');

    return `Here are some suggestions for you:\n\n${suggestionList}\n\nWould you like me to add any of these to your menu, or would you prefer different options?`;
  }

  /**
   * Build fallback response when AI is unavailable
   */
  private buildFallbackResponse(
    suggestions: RecipeSuggestion[],
    intent: MessageIntent
  ): MenuAssistantResponse {
    let message: string;

    if (suggestions.length === 0) {
      message = "I couldn't find any recipes matching your criteria. Would you like to try different filters?";
    } else {
      const suggestionList = suggestions
        .map((s, i) => `${i + 1}. **${s.recipe.title}** - ${s.reason}`)
        .join('\n');

      switch (intent) {
        case 'request_quick_meals':
          message = `Here are some quick meal ideas:\n\n${suggestionList}`;
          break;
        case 'request_dietary':
          message = `Here are some recipes that match your dietary preferences:\n\n${suggestionList}`;
          break;
        case 'request_variety':
          message = `Here are some different options to add variety to your menu:\n\n${suggestionList}`;
          break;
        case 'request_alternatives':
          message = `Here are some alternative suggestions:\n\n${suggestionList}`;
          break;
        default:
          message = `Here are my suggestions:\n\n${suggestionList}`;
      }
    }

    return {
      message,
      suggestions,
      needsClarification: suggestions.length === 0,
      followUpQuestions: this.generateFollowUpQuestions(intent),
    };
  }

  /**
   * Generate follow-up questions based on intent
   */
  private generateFollowUpQuestions(intent: MessageIntent): string[] {
    switch (intent) {
      case 'request_suggestions':
        return [
          'Would you like quick meals under 30 minutes?',
          'Any dietary restrictions I should consider?',
          'What cuisine are you in the mood for?',
        ];
      case 'request_quick_meals':
        return [
          'Would you like even faster options?',
          'Any specific ingredients you want to use?',
        ];
      case 'request_dietary':
        return [
          'Would you like more options with these restrictions?',
          'Any other dietary needs?',
        ];
      case 'request_variety':
        return [
          'What cuisines would you like to try?',
          'Any ingredients you want to feature?',
        ];
      default:
        return [
          'What kind of meals are you looking for?',
          'Any time or dietary constraints?',
        ];
    }
  }

  /**
   * Format constraints for display
   */
  private formatConstraints(constraints: MenuConstraints): string {
    const parts: string[] = [];

    if (constraints.dietaryRestrictions?.length) {
      parts.push(`Dietary: ${constraints.dietaryRestrictions.join(', ')}`);
    }
    if (constraints.maxPrepTime) {
      parts.push(`Max prep: ${constraints.maxPrepTime} min`);
    }
    if (constraints.maxCookTime) {
      parts.push(`Max cook: ${constraints.maxCookTime} min`);
    }
    if (constraints.includeTags?.length) {
      parts.push(`Tags: ${constraints.includeTags.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('; ') : 'None';
  }

  /**
   * Get all non-archived recipes
   */
  private getAllRecipes(): Recipe[] {
    const rows = this.db.exec(
      'SELECT id FROM recipes WHERE archived_at IS NULL LIMIT 100'
    );
    
    return rows
      .map(row => this.recipeService.getRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
  }
}

/**
 * Message intent types
 */
type MessageIntent =
  | 'request_suggestions'
  | 'request_alternatives'
  | 'request_quick_meals'
  | 'request_dietary'
  | 'request_leftover_ideas'
  | 'request_variety'
  | 'general_chat';
