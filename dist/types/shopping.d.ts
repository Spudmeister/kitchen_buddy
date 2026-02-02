/**
 * Shopping list types for Sous Chef
 */
import type { Unit } from './units.js';
import type { IngredientCategory } from './recipe.js';
/**
 * A shopping list generated from menus or recipes
 */
export interface ShoppingList {
    /** Unique identifier */
    id: string;
    /** Menu ID if generated from a menu */
    menuId?: string;
    /** Items in the shopping list */
    items: ShoppingItem[];
    /** When the list was created */
    createdAt: Date;
}
/**
 * An item in a shopping list
 */
export interface ShoppingItem {
    /** Unique identifier */
    id: string;
    /** Shopping list this item belongs to */
    listId: string;
    /** Name of the ingredient */
    name: string;
    /** Total quantity needed */
    quantity: number;
    /** Unit of measurement */
    unit: Unit;
    /** Category for organization */
    category: IngredientCategory;
    /** Whether the item has been checked off */
    checked: boolean;
    /** Recipe IDs that need this ingredient */
    recipeIds: string[];
    /** Earliest cook date for freshness planning */
    cookByDate?: Date;
}
/**
 * Input for adding a custom item to a shopping list
 */
export interface CustomItemInput {
    /** Name of the item */
    name: string;
    /** Quantity */
    quantity?: number;
    /** Unit of measurement */
    unit?: Unit;
    /** Category */
    category?: IngredientCategory;
}
//# sourceMappingURL=shopping.d.ts.map