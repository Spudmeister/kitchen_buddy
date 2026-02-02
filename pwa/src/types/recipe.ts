/**
 * Recipe-related types for Sous Chef PWA
 */

import type { Unit, Duration } from './units';

/**
 * Ingredient category for shopping list organization
 */
export type IngredientCategory =
  | 'produce'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'bakery'
  | 'frozen'
  | 'pantry'
  | 'spices'
  | 'beverages'
  | 'other';

/**
 * An ingredient in a recipe
 */
export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  category?: IngredientCategory;
}

/**
 * A single instruction step in a recipe
 */
export interface Instruction {
  id: string;
  step: number;
  text: string;
  duration?: Duration;
  notes?: string;
}

/**
 * A recipe version (immutable snapshot)
 */
export interface RecipeVersion {
  id: string;
  recipeId: string;
  version: number;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTime: Duration;
  cookTime: Duration;
  servings: number;
  sourceUrl?: string;
  createdAt: Date;
}

/**
 * A recipe with its current version and metadata
 */
export interface Recipe {
  id: string;
  currentVersion: number;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTime: Duration;
  cookTime: Duration;
  servings: number;
  tags: string[];
  rating?: number;
  sourceUrl?: string;
  folderId?: string;
  parentRecipeId?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

/**
 * Input for creating a new recipe
 */
export interface RecipeInput {
  title: string;
  description?: string;
  ingredients: IngredientInput[];
  instructions: InstructionInput[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  tags?: string[];
  sourceUrl?: string;
  folderId?: string;
  parentRecipeId?: string;
}

/**
 * Input for creating an ingredient
 */
export interface IngredientInput {
  name: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  category?: IngredientCategory;
}

/**
 * Input for creating an instruction
 */
export interface InstructionInput {
  text: string;
  durationMinutes?: number;
  notes?: string;
}

/**
 * Recipe heritage information (for duplicated recipes)
 */
export interface RecipeHeritage {
  recipe: Recipe;
  parent?: Recipe;
  ancestors: Recipe[];
  children: Recipe[];
}

/**
 * A folder for organizing recipes
 */
export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
}
