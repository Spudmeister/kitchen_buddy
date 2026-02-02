/**
 * Recipe-related types for Sous Chef
 */
import type { Unit, Duration } from './units.js';
/**
 * Ingredient category for shopping list organization
 */
export type IngredientCategory = 'produce' | 'meat' | 'seafood' | 'dairy' | 'bakery' | 'frozen' | 'pantry' | 'spices' | 'beverages' | 'other';
/**
 * An ingredient in a recipe
 */
export interface Ingredient {
    /** Unique identifier */
    id: string;
    /** Name of the ingredient */
    name: string;
    /** Quantity of the ingredient */
    quantity: number;
    /** Unit of measurement */
    unit: Unit;
    /** Optional notes (e.g., "finely chopped") */
    notes?: string;
    /** Category for shopping list organization */
    category?: IngredientCategory;
}
/**
 * A single instruction step in a recipe
 */
export interface Instruction {
    /** Unique identifier */
    id: string;
    /** Step number (1-indexed) */
    step: number;
    /** The instruction text */
    text: string;
    /** Optional duration for this step */
    duration?: Duration;
    /** Optional notes */
    notes?: string;
}
/**
 * A recipe version (immutable snapshot)
 */
export interface RecipeVersion {
    /** Unique identifier for this version */
    id: string;
    /** Recipe ID this version belongs to */
    recipeId: string;
    /** Version number (1-indexed) */
    version: number;
    /** Recipe title */
    title: string;
    /** Optional description */
    description?: string;
    /** List of ingredients */
    ingredients: Ingredient[];
    /** List of instructions */
    instructions: Instruction[];
    /** Preparation time */
    prepTime: Duration;
    /** Cooking time */
    cookTime: Duration;
    /** Number of servings */
    servings: number;
    /** Source URL if imported */
    sourceUrl?: string;
    /** When this version was created */
    createdAt: Date;
}
/**
 * A recipe with its current version and metadata
 */
export interface Recipe {
    /** Unique identifier */
    id: string;
    /** Current version number */
    currentVersion: number;
    /** Recipe title (from current version) */
    title: string;
    /** Optional description (from current version) */
    description?: string;
    /** List of ingredients (from current version) */
    ingredients: Ingredient[];
    /** List of instructions (from current version) */
    instructions: Instruction[];
    /** Preparation time (from current version) */
    prepTime: Duration;
    /** Cooking time (from current version) */
    cookTime: Duration;
    /** Number of servings (from current version) */
    servings: number;
    /** Tags associated with this recipe */
    tags: string[];
    /** Current rating (1-5) */
    rating?: number;
    /** Source URL if imported */
    sourceUrl?: string;
    /** Folder ID if organized */
    folderId?: string;
    /** Parent recipe ID if duplicated */
    parentRecipeId?: string;
    /** When the recipe was created */
    createdAt: Date;
    /** When the recipe was last updated */
    updatedAt: Date;
    /** When the recipe was archived (soft deleted) */
    archivedAt?: Date;
}
/**
 * Input for creating a new recipe
 */
export interface RecipeInput {
    /** Recipe title */
    title: string;
    /** Optional description */
    description?: string;
    /** List of ingredients */
    ingredients: IngredientInput[];
    /** List of instructions */
    instructions: InstructionInput[];
    /** Preparation time in minutes */
    prepTimeMinutes: number;
    /** Cooking time in minutes */
    cookTimeMinutes: number;
    /** Number of servings */
    servings: number;
    /** Tags to associate */
    tags?: string[];
    /** Source URL if imported */
    sourceUrl?: string;
    /** Folder ID to place in */
    folderId?: string;
    /** Parent recipe ID if duplicating */
    parentRecipeId?: string;
}
/**
 * Input for creating an ingredient
 */
export interface IngredientInput {
    /** Name of the ingredient */
    name: string;
    /** Quantity of the ingredient */
    quantity: number;
    /** Unit of measurement */
    unit: Unit;
    /** Optional notes */
    notes?: string;
    /** Category for shopping list */
    category?: IngredientCategory;
}
/**
 * Input for creating an instruction
 */
export interface InstructionInput {
    /** The instruction text */
    text: string;
    /** Optional duration in minutes */
    durationMinutes?: number;
    /** Optional notes */
    notes?: string;
}
/**
 * Recipe heritage information (for duplicated recipes)
 */
export interface RecipeHeritage {
    /** The recipe */
    recipe: Recipe;
    /** Parent recipe if duplicated */
    parent?: Recipe;
    /** Full lineage back to original */
    ancestors: Recipe[];
    /** Recipes duplicated from this one */
    children: Recipe[];
}
/**
 * A folder for organizing recipes
 */
export interface Folder {
    /** Unique identifier */
    id: string;
    /** Folder name */
    name: string;
    /** Parent folder ID */
    parentId?: string;
    /** When the folder was created */
    createdAt: Date;
}
//# sourceMappingURL=recipe.d.ts.map