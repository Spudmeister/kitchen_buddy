/**
 * Meal Prep Service - Browser-adapted version for PWA
 *
 * Provides meal prep plan generation with shared ingredient analysis
 * and prep task management.
 * Requirements: 24.1, 24.2, 24.3, 24.4
 */

import { v4 as uuidv4 } from 'uuid';
import type { BrowserDatabase } from '../db/browser-database';
import type {
  MealPrepPlan,
  PrepTask,
  SharedIngredient,
  MealPrepPlanInput,
} from '../types/meal-prep';
import type { Recipe, Ingredient } from '../types/recipe';
import type { Duration } from '../types/units';
import { RecipeService } from './recipe-service';

export class MealPrepService {
  private recipeService: RecipeService;

  constructor(private db: BrowserDatabase) {
    this.recipeService = new RecipeService(db);
  }

  /**
   * Generate a meal prep plan for multiple recipes
   * Requirements: 24.1, 24.2, 24.3, 24.4
   */
  generateMealPrepPlan(input: MealPrepPlanInput): MealPrepPlan {
    const { recipeIds, servingsOverride } = input;
    
    if (recipeIds.length === 0) {
      throw new Error('At least one recipe is required for meal prep');
    }

    // Fetch all recipes
    const recipes: Recipe[] = [];
    for (const recipeId of recipeIds) {
      const recipe = this.recipeService.getRecipe(recipeId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }
      recipes.push(recipe);
    }

    // Analyze shared ingredients
    const sharedIngredients = this.analyzeSharedIngredients(recipes, servingsOverride);

    // Generate prep tasks
    const tasks = this.generatePrepTasks(recipes, sharedIngredients, servingsOverride);

    // Calculate total time
    const totalTime = this.calculateTotalTime(tasks);

    const planId = uuidv4();
    const now = new Date();

    return {
      id: planId,
      recipeIds,
      tasks,
      totalTime,
      sharedIngredients,
      createdAt: now,
    };
  }

  /**
   * Analyze ingredients shared across multiple recipes
   * Requirements: 24.3 - Group tasks by shared ingredients
   */
  private analyzeSharedIngredients(
    recipes: Recipe[],
    servingsOverride?: Map<string, number>
  ): SharedIngredient[] {
    const ingredientMap = new Map<
      string,
      {
        name: string;
        unit: string;
        recipeIds: Set<string>;
        quantities: Map<string, number>;
      }
    >();

    for (const recipe of recipes) {
      const scaleFactor = servingsOverride
        ? (servingsOverride.get(recipe.id) ?? recipe.servings) / recipe.servings
        : 1;

      for (const ingredient of recipe.ingredients) {
        const key = this.normalizeIngredientKey(ingredient);
        const scaledQuantity = ingredient.quantity * scaleFactor;

        const existing = ingredientMap.get(key);
        if (existing) {
          existing.recipeIds.add(recipe.id);
          const currentQty = existing.quantities.get(recipe.id) ?? 0;
          existing.quantities.set(recipe.id, currentQty + scaledQuantity);
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            unit: ingredient.unit,
            recipeIds: new Set([recipe.id]),
            quantities: new Map([[recipe.id, scaledQuantity]]),
          });
        }
      }
    }

    // Only return ingredients shared across multiple recipes
    const sharedIngredients: SharedIngredient[] = [];
    for (const entry of ingredientMap.values()) {
      if (entry.recipeIds.size > 1) {
        let totalQuantity = 0;
        for (const qty of entry.quantities.values()) {
          totalQuantity += qty;
        }
        sharedIngredients.push({
          name: entry.name,
          totalQuantity,
          unit: entry.unit,
          recipeIds: Array.from(entry.recipeIds),
          quantitiesPerRecipe: entry.quantities,
        });
      }
    }

    return sharedIngredients;
  }

  /**
   * Generate prep tasks for the meal prep plan
   * Requirements: 24.2, 24.3, 24.4
   */
  private generatePrepTasks(
    recipes: Recipe[],
    sharedIngredients: SharedIngredient[],
    servingsOverride?: Map<string, number>
  ): PrepTask[] {
    const tasks: PrepTask[] = [];
    let order = 1;

    // Create a map of recipe IDs to titles for display
    const recipeTitles = new Map<string, string>();
    for (const recipe of recipes) {
      recipeTitles.set(recipe.id, recipe.title);
    }

    // First, add shared ingredient prep tasks
    for (const shared of sharedIngredients) {
      const recipeNames = shared.recipeIds
        .map((id) => recipeTitles.get(id) ?? 'Unknown')
        .join(', ');
      
      tasks.push({
        id: uuidv4(),
        description: `Prepare ${shared.name} (${shared.totalQuantity.toFixed(1)} ${shared.unit} total)`,
        recipeIds: shared.recipeIds,
        duration: { minutes: this.estimatePrepTime(shared.name) },
        order: order++,
        completed: false,
        taskType: 'ingredient_prep',
        ingredientName: shared.name,
      });
    }

    // Track which ingredients are shared to avoid duplicating prep tasks
    const sharedIngredientKeys = new Set(
      sharedIngredients.map((s) =>
        this.normalizeIngredientKey({ name: s.name, unit: s.unit } as Ingredient)
      )
    );

    // Add individual ingredient prep tasks for non-shared ingredients
    for (const recipe of recipes) {
      const scaleFactor = servingsOverride
        ? (servingsOverride.get(recipe.id) ?? recipe.servings) / recipe.servings
        : 1;

      for (const ingredient of recipe.ingredients) {
        const key = this.normalizeIngredientKey(ingredient);
        if (!sharedIngredientKeys.has(key)) {
          const scaledQty = ingredient.quantity * scaleFactor;
          tasks.push({
            id: uuidv4(),
            description: `Prepare ${ingredient.name} (${scaledQty.toFixed(1)} ${ingredient.unit}) for ${recipe.title}`,
            recipeIds: [recipe.id],
            duration: { minutes: this.estimatePrepTime(ingredient.name) },
            order: order++,
            completed: false,
            taskType: 'ingredient_prep',
            ingredientName: ingredient.name,
          });
        }
      }
    }

    // Add cooking steps for each recipe
    for (const recipe of recipes) {
      for (const instruction of recipe.instructions) {
        tasks.push({
          id: uuidv4(),
          description: `[${recipe.title}] Step ${instruction.step}: ${instruction.text}`,
          recipeIds: [recipe.id],
          duration: instruction.duration ?? { minutes: 5 },
          order: order++,
          completed: false,
          taskType: 'cooking',
        });
      }
    }

    return tasks;
  }

  /**
   * Estimate prep time for an ingredient based on its name
   */
  private estimatePrepTime(ingredientName: string): number {
    const name = ingredientName.toLowerCase();
    if (name.includes('onion') || name.includes('garlic')) return 5;
    if (name.includes('carrot') || name.includes('celery')) return 3;
    if (name.includes('potato') || name.includes('squash')) return 8;
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) return 10;
    return 2;
  }

  /**
   * Calculate total time for all tasks
   */
  private calculateTotalTime(tasks: PrepTask[]): Duration {
    let totalMinutes = 0;
    for (const task of tasks) {
      totalMinutes += task.duration.minutes;
    }
    return { minutes: totalMinutes };
  }

  /**
   * Normalize ingredient key for comparison
   */
  private normalizeIngredientKey(ingredient: { name: string; unit: string }): string {
    return `${ingredient.name.toLowerCase().trim()}|${ingredient.unit}`;
  }

  /**
   * Get recipes by IDs
   */
  getRecipes(recipeIds: string[]): Recipe[] {
    return recipeIds
      .map((id) => this.recipeService.getRecipe(id))
      .filter((r): r is Recipe => r !== undefined);
  }
}
