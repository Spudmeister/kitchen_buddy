/**
 * Recipe Instance types for Sous Chef PWA
 * 
 * A recipe instance captures the exact configuration used when cooking a recipe,
 * including scale factor, unit system, substitutions, and any modifications.
 * 
 * Requirements: 7.4, 23.4
 */

import type { UnitSystem } from './units';

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
 * Substitution used during cooking
 */
export interface InstanceSubstitution {
  /** Original ingredient name */
  originalIngredient: string;
  /** Substitute ingredient name */
  substituteIngredient: string;
  /** Conversion ratio applied */
  ratio: number;
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
  /** Substitutions used */
  substitutions?: InstanceSubstitution[];
}

/**
 * A recipe instance - captures the exact configuration used when cooking
 * Requirements: 7.4, 23.4 - Store scale factor, unit system, serving count, notes
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
  /** Substitutions used */
  substitutions: InstanceSubstitution[];
  /** Photo IDs associated with this instance */
  photoIds: string[];
  /** When this instance was created */
  createdAt: Date;
}
