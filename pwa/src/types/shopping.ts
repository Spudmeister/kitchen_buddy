/**
 * Shopping-related types for Sous Chef PWA
 */

import type { Unit } from './units';
import type { IngredientCategory } from './recipe';

/**
 * A shopping list
 */
export interface ShoppingList {
  id: string;
  menuId?: string;
  items: ShoppingItem[];
  createdAt: Date;
}

/**
 * A shopping list item
 */
export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: IngredientCategory;
  checked: boolean;
  recipeIds: string[];
  cookByDate?: Date;
}

/**
 * Input for adding a custom item
 */
export interface CustomItemInput {
  name: string;
  quantity?: number;
  unit?: Unit;
  category?: IngredientCategory;
}
