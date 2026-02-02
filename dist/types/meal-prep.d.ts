/**
 * Meal prep types for Sous Chef
 *
 * Types for meal prep mode which consolidates cooking steps
 * when preparing multiple recipes.
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
import type { Duration } from './units.js';
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
export type PrepTaskType = 'ingredient_prep' | 'cooking' | 'assembly' | 'cleanup';
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
 * Input for updating a prep task
 */
export interface PrepTaskUpdate {
    /** New completion status */
    completed?: boolean;
}
//# sourceMappingURL=meal-prep.d.ts.map