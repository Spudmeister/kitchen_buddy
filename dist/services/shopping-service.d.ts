/**
 * Shopping Service - Business logic for shopping list generation
 *
 * Provides shopping list generation from menus and recipes with
 * ingredient consolidation and category organization.
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
import type { Database } from '../db/database.js';
import type { ShoppingList, ShoppingItem, CustomItemInput } from '../types/shopping.js';
import type { IngredientCategory } from '../types/recipe.js';
import { MenuService } from './menu-service.js';
import { RecipeService } from './recipe-service.js';
/**
 * Service for generating and managing shopping lists
 */
export declare class ShoppingService {
    private db;
    private menuService;
    private recipeService;
    constructor(db: Database, menuService: MenuService, recipeService: RecipeService);
    /**
     * Generate a shopping list from a menu
     * Requirements: 5.1 - Consolidate all ingredients from selected recipes
     */
    generateFromMenu(menuId: string): ShoppingList;
    /**
     * Generate a shopping list from specific recipes
     * Requirements: 5.1 - Consolidate all ingredients from selected recipes
     */
    generateFromRecipes(recipeIds: string[], servings?: Map<string, number>): ShoppingList;
    /**
     * Get a shopping list by ID
     */
    getList(id: string): ShoppingList | undefined;
    /**
     * Check an item (mark as purchased)
     * Requirements: 5.3 - Mark item as purchased
     */
    checkItem(listId: string, itemId: string): void;
    /**
     * Uncheck an item (mark as not purchased)
     * Requirements: 5.3 - Mark item as not purchased
     */
    uncheckItem(listId: string, itemId: string): void;
    /**
     * Add a custom item to a shopping list
     */
    addCustomItem(listId: string, input: CustomItemInput): ShoppingItem;
    /**
     * Export shopping list to plain text
     */
    exportToText(listId: string): string;
    /**
     * Delete a shopping list
     */
    deleteList(id: string): void;
    /**
     * Internal method to generate a shopping list with consolidation
     * Requirements: 5.2 - Combine quantities for same ingredients
     */
    private generateListInternal;
    /**
     * Consolidate ingredients from multiple recipes
     * Requirements: 5.2 - Combine same ingredients, sum quantities
     */
    private consolidateIngredients;
    /**
     * Generate a consolidation key for an ingredient
     * Ingredients with same name and unit are consolidated
     */
    private getConsolidationKey;
    /**
     * Get items for a shopping list
     */
    private getItems;
    /**
     * Get a single item by ID
     */
    private getItem;
    /**
     * Get recipe IDs associated with a shopping item
     */
    private getItemRecipeIds;
    /**
     * Group items by category
     * Requirements: 5.4 - Organize items by category
     */
    private groupByCategory;
    /**
     * Format category name for display
     */
    private formatCategory;
    /**
     * Get items grouped by category
     * Requirements: 5.4 - Items grouped by category when displayed
     */
    getItemsByCategory(listId: string): Map<IngredientCategory, ShoppingItem[]>;
}
//# sourceMappingURL=shopping-service.d.ts.map