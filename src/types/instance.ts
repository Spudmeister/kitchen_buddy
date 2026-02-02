/**
 * Recipe Instance types for Sous Chef
 * Requirements: 18.1, 18.2, 18.3 - Capture exact configuration used when cooking
 */

import type { UnitSystem } from './units.js';

/**
 * Modification made to an ingredient during cooking
 */
export interface IngredientModification {
  /** Index of the ingredient in the recipe */
  ingredientIndex: number;
  /** Original quantity from the recipe */
  originalQuantity: number;
  /** Modified quantity used */
  modifiedQuantity: number;
  /** Optional note about the modification */
  note?: string;
}

/**
 * Configuration for creating a recipe instance
 */
export interface InstanceConfig {
  /** Scale factor applied to the recipe */
  scaleFactor?: number;
  /** Unit system used */
  unitSystem?: UnitSystem;
  /** Number of servings made */
  servings?: number;
  /** Notes about this cook */
  notes?: string;
  /** Modifications made to ingredients */
  modifications?: IngredientModification[];
}

/**
 * A recipe instance - captures the exact configuration used when cooking
 * Requirements: 18.2 - Store scale factor, unit system, serving count, notes
 */
export interface RecipeInstance {
  /** Unique identifier */
  id: string;
  /** Recipe ID this instance is for */
  recipeId: string;
  /** Recipe version that was used */
  recipeVersion: number;
  /** Optional cook session ID if logged */
  cookSessionId?: string;
  /** Scale factor applied */
  scaleFactor: number;
  /** Unit system used */
  unitSystem: UnitSystem;
  /** Number of servings made */
  servings: number;
  /** Notes about this cook */
  notes?: string;
  /** Modifications made to ingredients */
  modifications: IngredientModification[];
  /** Photo IDs associated with this instance */
  photoIds: string[];
  /** When this instance was created */
  createdAt: Date;
}
