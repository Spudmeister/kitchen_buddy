/**
 * Sue Service - Menu Assistant service for PWA
 *
 * Provides AI-powered menu planning assistance including:
 * - Availability checking
 * - Recipe suggestions based on constraints
 * - Variety tracking
 * - Constraint filtering
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 */

import type { BrowserDatabase } from '@db/browser-database';
import type { Recipe } from '@/types/recipe';
import type { Menu, MealSlot } from '@/types/menu';
import type {
  RecipeSuggestion,
  MenuConstraints,
  VarietyPreferences,
  SueResponse,
  SuggestionAcceptResult,
} from '@/types/sue';
import { RecipeService } from './recipe-service';
import { MenuService } from './menu-service';

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
 * AI Configuration stored in localStorage
 */
interface AIConfig {
  enabled: boolean;
  provider?: string;
  apiKey?: string;
  endpoint?: string;
}

/**
 * Sue Service - AI-powered menu planning assistant
 */
export class SueService {
  private recipeService: RecipeService;
  private menuService: MenuService;

  constructor(db: BrowserDatabase) {
    this.recipeService = new RecipeService(db);
    this.menuService = new MenuService(db);
  }

  /**
   * Check if Sue (AI features) is available
   * Requirements: 16.1, 16.6 - Available only when AI is enabled
   */
  isAvailable(): boolean {
    const config = this.getAIConfig();
    return config.enabled;
  }

  /**
   * Get AI configuration from localStorage
   */
  getAIConfig(): AIConfig {
    try {
      const stored = localStorage.getItem('sous-chef-ai-config');
      if (stored) {
        return JSON.parse(stored) as AIConfig;
      }
    } catch {
      // Ignore parse errors
    }
    return { enabled: false };
  }

  /**
   * Set AI configuration
   */
  setAIConfig(config: AIConfig): void {
    localStorage.setItem('sous-chef-ai-config', JSON.stringify(config));
  }

  /**
   * Enable AI features
   */
  enableAI(provider?: string, apiKey?: string, endpoint?: string): void {
    this.setAIConfig({
      enabled: true,
      provider,
      apiKey,
      endpoint,
    });
  }

  /**
   * Disable AI features
   */
  disableAI(): void {
    this.setAIConfig({ enabled: false });
  }

  /**
   * Filter recipes by constraints
   * Requirements: 16.2, 16.5 - Filter by dietary restrictions, time, ingredients
   */
  filterRecipesByConstraints(
    constraints: MenuConstraints,
    limit: number = 10
  ): Recipe[] {
    let recipes = this.recipeService.getAllRecipes();

    // Filter by dietary restrictions (tags)
    if (constraints.dietaryRestrictions && constraints.dietaryRestrictions.length > 0) {
      const requiredTags = constraints.dietaryRestrictions.map(t => t.toLowerCase());
      recipes = recipes.filter(recipe =>
        requiredTags.every(tag =>
          recipe.tags.some(t => t.toLowerCase() === tag)
        )
      );
    }

    // Filter by max prep time
    if (constraints.maxPrepTime !== undefined) {
      recipes = recipes.filter(recipe =>
        recipe.prepTime.minutes <= constraints.maxPrepTime!
      );
    }

    // Filter by max cook time
    if (constraints.maxCookTime !== undefined) {
      recipes = recipes.filter(recipe =>
        recipe.cookTime.minutes <= constraints.maxCookTime!
      );
    }

    // Filter by max total time
    if (constraints.maxTotalTime !== undefined) {
      recipes = recipes.filter(recipe =>
        recipe.prepTime.minutes + recipe.cookTime.minutes <= constraints.maxTotalTime!
      );
    }

    // Filter by minimum rating
    if (constraints.minRating !== undefined) {
      recipes = recipes.filter(recipe =>
        recipe.rating !== undefined && recipe.rating >= constraints.minRating!
      );
    }

    // Filter by included tags
    if (constraints.includeTags && constraints.includeTags.length > 0) {
      const requiredTags = constraints.includeTags.map(t => t.toLowerCase());
      recipes = recipes.filter(recipe =>
        requiredTags.some(tag =>
          recipe.tags.some(t => t.toLowerCase() === tag)
        )
      );
    }

    // Filter by excluded tags
    if (constraints.excludeTags && constraints.excludeTags.length > 0) {
      const excludedTags = constraints.excludeTags.map(t => t.toLowerCase());
      recipes = recipes.filter(recipe =>
        !excludedTags.some(tag =>
          recipe.tags.some(t => t.toLowerCase() === tag)
        )
      );
    }

    // Filter by available ingredients
    if (constraints.availableIngredients && constraints.availableIngredients.length > 0) {
      const available = constraints.availableIngredients.map(i => i.toLowerCase());
      recipes = recipes.filter(recipe =>
        recipe.ingredients.some(ing =>
          available.some(a => ing.name.toLowerCase().includes(a))
        )
      );
    }

    // Filter by excluded ingredients
    if (constraints.excludeIngredients && constraints.excludeIngredients.length > 0) {
      const excluded = constraints.excludeIngredients.map(i => i.toLowerCase());
      recipes = recipes.filter(recipe =>
        !recipe.ingredients.some(ing =>
          excluded.some(e => ing.name.toLowerCase().includes(e))
        )
      );
    }

    // Filter by servings
    if (constraints.servings !== undefined) {
      // Allow recipes within 50% of target servings
      const minServings = Math.floor(constraints.servings * 0.5);
      const maxServings = Math.ceil(constraints.servings * 1.5);
      recipes = recipes.filter(recipe =>
        recipe.servings >= minServings && recipe.servings <= maxServings
      );
    }

    return recipes.slice(0, limit);
  }

  /**
   * Get suggestions with variety filtering
   * Requirements: 16.3, 16.4 - Avoid repeating cuisines/ingredients
   */
  getSuggestionsWithVariety(
    constraints: MenuConstraints,
    menu: Menu | undefined,
    varietyPreferences: VarietyPreferences,
    excludeRecipeIds: string[] = [],
    limit: number = 5
  ): RecipeSuggestion[] {
    // Get filtered recipes
    let recipes = this.filterRecipesByConstraints(constraints, limit * 4);

    // Exclude already suggested/rejected recipes
    recipes = recipes.filter(r => !excludeRecipeIds.includes(r.id));

    // Apply variety filtering if menu exists
    if (menu && menu.assignments.length > 0) {
      const usedCuisines = this.getUsedCuisines(menu);
      const usedIngredients = this.getUsedMainIngredients(menu);

      // Add user-specified avoidances
      if (varietyPreferences.avoidCuisines) {
        for (const cuisine of varietyPreferences.avoidCuisines) {
          usedCuisines.add(cuisine.toLowerCase());
        }
      }
      if (varietyPreferences.avoidMainIngredients) {
        for (const ingredient of varietyPreferences.avoidMainIngredients) {
          usedIngredients.add(ingredient.toLowerCase());
        }
      }

      // Score recipes by variety
      const scoredRecipes = recipes.map(recipe => {
        let score = 0;

        // Check for new cuisine
        const recipeCuisines = recipe.tags.filter(t =>
          CUISINE_TAGS.includes(t.toLowerCase())
        );
        const hasNewCuisine = recipeCuisines.some(c =>
          !usedCuisines.has(c.toLowerCase())
        );
        if (hasNewCuisine && varietyPreferences.preferNewCuisines !== false) {
          score += 2;
        }

        // Check for new main ingredient
        let hasNewMainIngredient = false;
        for (const ingredient of recipe.ingredients) {
          const ingredientLower = ingredient.name.toLowerCase();
          for (const mainIngredient of MAIN_INGREDIENT_CATEGORIES) {
            if (ingredientLower.includes(mainIngredient) &&
                !usedIngredients.has(mainIngredient)) {
              hasNewMainIngredient = true;
              break;
            }
          }
          if (hasNewMainIngredient) break;
        }
        if (hasNewMainIngredient && varietyPreferences.preferNewIngredients !== false) {
          score += 2;
        }

        // Boost for rating
        if (recipe.rating && recipe.rating >= 4) {
          score += 1;
        }

        return { recipe, score };
      });

      // Sort by score descending
      scoredRecipes.sort((a, b) => b.score - a.score);
      recipes = scoredRecipes.map(s => s.recipe);
    }

    // Convert to suggestions
    return recipes.slice(0, limit).map(recipe => ({
      recipe,
      reason: this.generateSuggestionReason(recipe, menu),
      confidence: this.calculateConfidence(recipe, constraints, menu),
    }));
  }

  /**
   * Get cuisines used in a menu
   */
  getUsedCuisines(menu: Menu): Set<string> {
    const cuisines = new Set<string>();

    for (const assignment of menu.assignments) {
      const recipe = this.recipeService.getRecipe(assignment.recipeId);
      if (recipe) {
        for (const tag of recipe.tags) {
          if (CUISINE_TAGS.includes(tag.toLowerCase())) {
            cuisines.add(tag.toLowerCase());
          }
        }
      }
    }

    return cuisines;
  }

  /**
   * Get main ingredients used in a menu
   */
  getUsedMainIngredients(menu: Menu): Set<string> {
    const ingredients = new Set<string>();

    for (const assignment of menu.assignments) {
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

    return ingredients;
  }

  /**
   * Accept a suggestion and add to menu
   * Requirements: 16.4 - Add suggested recipes to menu
   */
  acceptSuggestion(
    menuId: string,
    recipeId: string,
    date: Date,
    mealSlot: MealSlot,
    servings?: number
  ): SuggestionAcceptResult {
    try {
      const assignment = this.menuService.assignRecipe(menuId, {
        recipeId,
        date,
        mealSlot,
        servings,
      });

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
   * Generate a reason for suggesting a recipe
   */
  private generateSuggestionReason(recipe: Recipe, menu?: Menu): string {
    const reasons: string[] = [];

    // Check rating
    if (recipe.rating && recipe.rating >= 4) {
      reasons.push('highly rated');
    }

    // Check time
    const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
    if (totalTime <= 30) {
      reasons.push('quick to make');
    }

    // Check for variety
    if (menu && menu.assignments.length > 0) {
      const usedCuisines = this.getUsedCuisines(menu);
      const recipeCuisines = recipe.tags.filter(t =>
        CUISINE_TAGS.includes(t.toLowerCase())
      );
      const newCuisines = recipeCuisines.filter(c =>
        !usedCuisines.has(c.toLowerCase())
      );
      if (newCuisines.length > 0) {
        reasons.push(`adds ${newCuisines[0]} cuisine`);
      }
    }

    // Check cuisine tags
    const cuisineTags = recipe.tags.filter(t =>
      CUISINE_TAGS.includes(t.toLowerCase())
    );
    if (cuisineTags.length > 0 && reasons.length < 2) {
      reasons.push(`${cuisineTags[0]} cuisine`);
    }

    if (reasons.length === 0) {
      return 'matches your preferences';
    }

    return reasons.join(', ');
  }

  /**
   * Calculate confidence score for a suggestion
   */
  private calculateConfidence(
    recipe: Recipe,
    constraints: MenuConstraints,
    menu?: Menu
  ): number {
    let confidence = 0.5;

    // Boost for rating
    if (recipe.rating) {
      confidence += (recipe.rating - 3) * 0.1;
    }

    // Boost for matching time constraints
    const totalTime = recipe.prepTime.minutes + recipe.cookTime.minutes;
    if (constraints.maxTotalTime && totalTime <= constraints.maxTotalTime) {
      confidence += 0.1;
    }

    // Boost for variety
    if (menu && menu.assignments.length > 0) {
      const usedCuisines = this.getUsedCuisines(menu);
      const recipeCuisines = recipe.tags.filter(t =>
        CUISINE_TAGS.includes(t.toLowerCase())
      );
      const hasNewCuisine = recipeCuisines.some(c =>
        !usedCuisines.has(c.toLowerCase())
      );
      if (hasNewCuisine) {
        confidence += 0.15;
      }
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Generate a chat response (rule-based fallback when AI unavailable)
   */
  generateResponse(
    _message: string,
    constraints: MenuConstraints,
    menu: Menu | undefined,
    varietyPreferences: VarietyPreferences,
    excludeRecipeIds: string[] = []
  ): SueResponse {
    const suggestions = this.getSuggestionsWithVariety(
      constraints,
      menu,
      varietyPreferences,
      excludeRecipeIds,
      5
    );

    let responseMessage: string;

    if (suggestions.length === 0) {
      responseMessage = "I couldn't find any recipes matching your criteria. " +
        "Would you like to try different filters?";
    } else {
      const suggestionList = suggestions
        .map((s, i) => `${i + 1}. **${s.recipe.title}** - ${s.reason}`)
        .join('\n');

      responseMessage = `Here are some suggestions for you:\n\n${suggestionList}\n\n` +
        "Would you like me to add any of these to your menu, or would you prefer different options?";
    }

    return {
      message: responseMessage,
      suggestions,
      needsClarification: suggestions.length === 0,
      followUpQuestions: [
        'Would you like quick meals under 30 minutes?',
        'Any dietary restrictions I should consider?',
        'What cuisine are you in the mood for?',
      ],
    };
  }
}
