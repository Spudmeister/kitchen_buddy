/**
 * Meal prep types for Sous Chef PWA
 * 
 * Types for meal prep mode which consolidates cooking steps
 * when preparing multiple recipes.
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7
 */

import type { Duration } from './units';

/**
 * A meal prep plan for batch cooking multiple recipes
 */
export interface MealPrepPlan {
  /** Unique identifier */
  id: string;
  /** Recipe IDs included in this plan */
  recipeIds: string[];
  /** Ordered list of prep tasks */
  tasks: PrepTask[];
  /** Total estimated time for all tasks */
  totalTime: Duration;
  /** Ingredients shared across multiple recipes */
  sharedIngredients: SharedIngredient[];
  /** When the plan was created */
  createdAt: Date;
}

/**
 * A single preparation task in a meal prep plan
 */
export interface PrepTask {
  /** Unique identifier */
  id: string;
  /** Description of the task */
  description: string;
  /** Recipe IDs this task serves */
  recipeIds: string[];
  /** Estimated duration for this task */
  duration: Duration;
  /** Order in the sequence (1-indexed) */
  order: number;
  /** Whether the task has been completed */
  completed: boolean;
  /** Type of task for grouping */
  taskType: PrepTaskType;
  /** Ingredient name if this is an ingredient prep task */
  ingredientName?: string;
}

/**
 * Types of prep tasks
 */
export type PrepTaskType = 
  | 'ingredient_prep'  // Chopping, measuring, etc.
  | 'cooking'          // Actual cooking steps
  | 'assembly'         // Putting things together
  | 'cleanup';         // Cleanup between steps

/**
 * An ingredient shared across multiple recipes
 */
export interface SharedIngredient {
  /** Ingredient name */
  name: string;
  /** Total quantity needed across all recipes */
  totalQuantity: number;
  /** Unit of measurement */
  unit: string;
  /** Recipe IDs that use this ingredient */
  recipeIds: string[];
  /** Quantities per recipe */
  quantitiesPerRecipe: Map<string, number>;
}

/**
 * Input for creating a meal prep plan
 */
export interface MealPrepPlanInput {
  /** Recipe IDs to include in the plan */
  recipeIds: string[];
  /** Optional servings override per recipe */
  servingsOverride?: Map<string, number>;
}

/**
 * State for meal prep session (in-memory, not persisted)
 */
export interface MealPrepState {
  /** Selected recipe IDs */
  selectedRecipeIds: string[];
  /** Servings per recipe */
  servingsPerRecipe: Map<string, number>;
  /** Generated prep plan */
  plan: MealPrepPlan | null;
  /** Current step index */
  currentStep: number;
  /** Completed task IDs */
  completedTaskIds: Set<string>;
  /** Whether the session is complete */
  isComplete: boolean;
}
