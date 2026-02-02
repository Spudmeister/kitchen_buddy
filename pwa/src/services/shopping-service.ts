/**
 * Shopping Service - Business logic for shopping list generation
 *
 * Provides shopping list generation from menus and recipes with
 * ingredient consolidation and category organization.
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5, 20.1, 20.2, 20.3, 20.4
 */

import { v4 as uuidv4 } from 'uuid';
import type { BrowserDatabase } from '@db/browser-database';
import type { ShoppingList, ShoppingItem, CustomItemInput } from '@/types/shopping';
import type { Unit } from '@/types/units';
import type { IngredientCategory, Ingredient } from '@/types/recipe';
import { MenuService } from './menu-service';
import { RecipeService } from './recipe-service';

/**
 * Internal representation of an ingredient for consolidation
 */
interface ConsolidationEntry {
  name: string;
  quantity: number;
  unit: Unit;
  category: IngredientCategory;
  recipeIds: Set<string>;
  cookByDate?: Date;
}

/**
 * Service for generating and managing shopping lists
 */
export class ShoppingService {
  constructor(
    private db: BrowserDatabase,
    private menuService: MenuService,
    private recipeService: RecipeService
  ) {}

  /**
   * Generate a shopping list from a menu
   * Requirements: 18.1 - Consolidate all ingredients from menu
   */
  generateFromMenu(menuId: string): ShoppingList {
    const menu = this.menuService.getMenu(menuId);
    if (!menu) {
      throw new Error(`Menu not found: ${menuId}`);
    }

    // Collect all recipe IDs and their servings/cook dates from assignments
    const recipeData = new Map<string, { servings: number; cookDate: Date }>();

    for (const assignment of menu.assignments) {
      // Skip leftover assignments - they don't need new ingredients
      if (assignment.isLeftover) continue;

      const existing = recipeData.get(assignment.recipeId);
      if (existing) {
        // Sum servings if same recipe appears multiple times
        existing.servings += assignment.servings;
        // Use earliest cook date
        if (assignment.cookDate < existing.cookDate) {
          existing.cookDate = assignment.cookDate;
        }
      } else {
        recipeData.set(assignment.recipeId, {
          servings: assignment.servings,
          cookDate: assignment.cookDate,
        });
      }
    }

    // Generate list with menu reference
    return this.generateListInternal(recipeData, menuId);
  }

  /**
   * Generate a shopping list from specific recipes
   * Requirements: 18.1 - Consolidate all ingredients from selected recipes
   */
  generateFromRecipes(
    recipeIds: string[],
    servings?: Map<string, number>
  ): ShoppingList {
    const recipeData = new Map<string, { servings: number; cookDate?: Date }>();

    for (const recipeId of recipeIds) {
      const recipe = this.recipeService.getRecipe(recipeId);
      if (!recipe) {
        throw new Error(`Recipe not found: ${recipeId}`);
      }

      recipeData.set(recipeId, {
        servings: servings?.get(recipeId) ?? recipe.servings,
      });
    }

    return this.generateListInternal(recipeData);
  }

  /**
   * Get a shopping list by ID
   */
  getList(id: string): ShoppingList | undefined {
    const listRow = this.db.get<unknown[]>(
      'SELECT id, menu_id, created_at FROM shopping_lists WHERE id = ?',
      [id]
    );

    if (!listRow) {
      return undefined;
    }

    const items = this.getItems(listRow[0] as string);

    return {
      id: listRow[0] as string,
      menuId: (listRow[1] as string | null) ?? undefined,
      items,
      createdAt: new Date(listRow[2] as string),
    };
  }

  /**
   * Get shopping list for a menu
   */
  getListForMenu(menuId: string): ShoppingList | undefined {
    const listRow = this.db.get<unknown[]>(
      'SELECT id, menu_id, created_at FROM shopping_lists WHERE menu_id = ? ORDER BY created_at DESC LIMIT 1',
      [menuId]
    );

    if (!listRow) {
      return undefined;
    }

    const items = this.getItems(listRow[0] as string);

    return {
      id: listRow[0] as string,
      menuId: (listRow[1] as string | null) ?? undefined,
      items,
      createdAt: new Date(listRow[2] as string),
    };
  }

  /**
   * Check an item (mark as purchased)
   * Requirements: 19.1 - Toggle checked state on tap
   */
  checkItem(listId: string, itemId: string): void {
    const item = this.getItem(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }
    if (item.listId !== listId) {
      throw new Error(`Item ${itemId} does not belong to list ${listId}`);
    }

    this.db.run('UPDATE shopping_items SET checked = 1 WHERE id = ?', [itemId]);
  }

  /**
   * Uncheck an item (mark as not purchased)
   * Requirements: 19.1 - Toggle checked state on tap
   */
  uncheckItem(listId: string, itemId: string): void {
    const item = this.getItem(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }
    if (item.listId !== listId) {
      throw new Error(`Item ${itemId} does not belong to list ${listId}`);
    }

    this.db.run('UPDATE shopping_items SET checked = 0 WHERE id = ?', [itemId]);
  }

  /**
   * Add a custom item to a shopping list
   * Requirements: 20.1, 20.2, 20.3, 20.4 - Add non-recipe items
   */
  addCustomItem(listId: string, input: CustomItemInput): ShoppingItem {
    const list = this.getList(listId);
    if (!list) {
      throw new Error(`Shopping list not found: ${listId}`);
    }

    const itemId = uuidv4();
    const category = input.category ?? 'other';
    const unit = input.unit ?? 'piece';
    const quantity = input.quantity ?? 1;

    this.db.run(
      `INSERT INTO shopping_items (id, list_id, name, quantity, unit, category, checked, cook_by_date)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
      [itemId, listId, input.name, quantity, unit, category]
    );

    return {
      id: itemId,
      listId,
      name: input.name,
      quantity,
      unit,
      category,
      checked: false,
      recipeIds: [], // Custom items don't have recipe associations
    };
  }

  /**
   * Delete a custom item from a shopping list
   * Requirements: 20.4 - Allow deletion
   */
  deleteItem(listId: string, itemId: string): void {
    const item = this.getItem(itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }
    if (item.listId !== listId) {
      throw new Error(`Item ${itemId} does not belong to list ${listId}`);
    }

    // Delete recipe associations first
    this.db.run('DELETE FROM shopping_item_recipes WHERE item_id = ?', [itemId]);
    // Delete the item
    this.db.run('DELETE FROM shopping_items WHERE id = ?', [itemId]);
  }

  /**
   * Delete a shopping list
   */
  deleteList(id: string): void {
    const list = this.getList(id);
    if (!list) {
      throw new Error(`Shopping list not found: ${id}`);
    }

    // Delete item-recipe associations
    this.db.run(
      `DELETE FROM shopping_item_recipes WHERE item_id IN 
       (SELECT id FROM shopping_items WHERE list_id = ?)`,
      [id]
    );
    // Delete items
    this.db.run('DELETE FROM shopping_items WHERE list_id = ?', [id]);
    // Delete list
    this.db.run('DELETE FROM shopping_lists WHERE id = ?', [id]);
  }

  /**
   * Get items grouped by category
   * Requirements: 18.3 - Items organized by store category
   */
  getItemsByCategory(listId: string): Map<IngredientCategory, ShoppingItem[]> {
    const list = this.getList(listId);
    if (!list) {
      throw new Error(`Shopping list not found: ${listId}`);
    }
    return this.groupByCategory(list.items);
  }

  /**
   * Get progress stats for a shopping list
   * Requirements: 19.3 - Show progress
   */
  getProgress(listId: string): { checked: number; total: number; percentage: number } {
    const list = this.getList(listId);
    if (!list) {
      throw new Error(`Shopping list not found: ${listId}`);
    }

    const total = list.items.length;
    const checked = list.items.filter((item) => item.checked).length;
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

    return { checked, total, percentage };
  }

  // Private helper methods

  /**
   * Internal method to generate a shopping list with consolidation
   * Requirements: 18.2 - Combine quantities for same ingredients
   */
  private generateListInternal(
    recipeData: Map<string, { servings: number; cookDate?: Date }>,
    menuId?: string
  ): ShoppingList {
    const listId = uuidv4();
    const now = new Date().toISOString();

    // Consolidate ingredients across all recipes
    const consolidated = this.consolidateIngredients(recipeData);

    // Create shopping list
    this.db.run(
      'INSERT INTO shopping_lists (id, menu_id, created_at) VALUES (?, ?, ?)',
      [listId, menuId ?? null, now]
    );

    // Create items
    const items: ShoppingItem[] = [];
    for (const entry of consolidated.values()) {
      const itemId = uuidv4();
      const cookByDateStr = entry.cookByDate?.toISOString().split('T')[0] ?? null;

      this.db.run(
        `INSERT INTO shopping_items (id, list_id, name, quantity, unit, category, checked, cook_by_date)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [itemId, listId, entry.name, entry.quantity, entry.unit, entry.category, cookByDateStr]
      );

      // Store recipe associations
      for (const recipeId of entry.recipeIds) {
        this.db.run(
          'INSERT INTO shopping_item_recipes (item_id, recipe_id) VALUES (?, ?)',
          [itemId, recipeId]
        );
      }

      items.push({
        id: itemId,
        listId,
        name: entry.name,
        quantity: entry.quantity,
        unit: entry.unit,
        category: entry.category,
        checked: false,
        recipeIds: Array.from(entry.recipeIds),
        cookByDate: entry.cookByDate,
      });
    }

    return {
      id: listId,
      menuId,
      items,
      createdAt: new Date(now),
    };
  }

  /**
   * Consolidate ingredients from multiple recipes
   * Requirements: 18.2 - Combine same ingredients, sum quantities
   */
  private consolidateIngredients(
    recipeData: Map<string, { servings: number; cookDate?: Date }>
  ): Map<string, ConsolidationEntry> {
    const consolidated = new Map<string, ConsolidationEntry>();

    for (const [recipeId, data] of recipeData) {
      const recipe = this.recipeService.getRecipe(recipeId);
      if (!recipe) continue;

      // Calculate scale factor based on servings
      const scaleFactor = data.servings / recipe.servings;

      for (const ingredient of recipe.ingredients) {
        const key = this.getConsolidationKey(ingredient);
        const scaledQuantity = ingredient.quantity * scaleFactor;

        const existing = consolidated.get(key);
        if (existing) {
          // Same ingredient with compatible unit - sum quantities
          existing.quantity += scaledQuantity;
          existing.recipeIds.add(recipeId);
          // Use earliest cook date
          if (data.cookDate && (!existing.cookByDate || data.cookDate < existing.cookByDate)) {
            existing.cookByDate = data.cookDate;
          }
        } else {
          // New ingredient
          consolidated.set(key, {
            name: ingredient.name,
            quantity: scaledQuantity,
            unit: ingredient.unit,
            category: ingredient.category ?? 'other',
            recipeIds: new Set([recipeId]),
            cookByDate: data.cookDate,
          });
        }
      }
    }

    return consolidated;
  }

  /**
   * Generate a consolidation key for an ingredient
   * Ingredients with same name and unit are consolidated
   */
  private getConsolidationKey(ingredient: Ingredient): string {
    // Normalize name to lowercase for matching
    const normalizedName = ingredient.name.toLowerCase().trim();
    return `${normalizedName}|${ingredient.unit}`;
  }

  /**
   * Get items for a shopping list
   */
  private getItems(listId: string): ShoppingItem[] {
    const rows = this.db.exec(
      `SELECT id, list_id, name, quantity, unit, category, checked, cook_by_date
       FROM shopping_items WHERE list_id = ? ORDER BY category, name`,
      [listId]
    );

    return rows.map((row) => {
      const itemId = row[0] as string;
      const recipeIds = this.getItemRecipeIds(itemId);

      return {
        id: itemId,
        listId: row[1] as string,
        name: row[2] as string,
        quantity: row[3] as number,
        unit: row[4] as Unit,
        category: (row[5] as IngredientCategory) ?? 'other',
        checked: row[6] === 1,
        recipeIds,
        cookByDate: row[7] ? new Date(row[7] as string) : undefined,
      };
    });
  }

  /**
   * Get a single item by ID
   */
  private getItem(itemId: string): ShoppingItem | undefined {
    const row = this.db.get<unknown[]>(
      `SELECT id, list_id, name, quantity, unit, category, checked, cook_by_date
       FROM shopping_items WHERE id = ?`,
      [itemId]
    );

    if (!row) {
      return undefined;
    }

    const recipeIds = this.getItemRecipeIds(itemId);

    return {
      id: row[0] as string,
      listId: row[1] as string,
      name: row[2] as string,
      quantity: row[3] as number,
      unit: row[4] as Unit,
      category: (row[5] as IngredientCategory) ?? 'other',
      checked: row[6] === 1,
      recipeIds,
      cookByDate: row[7] ? new Date(row[7] as string) : undefined,
    };
  }

  /**
   * Get recipe IDs associated with a shopping item
   */
  private getItemRecipeIds(itemId: string): string[] {
    const rows = this.db.exec(
      'SELECT recipe_id FROM shopping_item_recipes WHERE item_id = ?',
      [itemId]
    );
    return rows.map((row) => row[0] as string);
  }

  /**
   * Group items by category
   * Requirements: 18.3 - Organize items by category
   */
  private groupByCategory(items: ShoppingItem[]): Map<IngredientCategory, ShoppingItem[]> {
    const groups = new Map<IngredientCategory, ShoppingItem[]>();

    // Define category order for display
    const categoryOrder: IngredientCategory[] = [
      'produce',
      'meat',
      'seafood',
      'dairy',
      'bakery',
      'frozen',
      'pantry',
      'spices',
      'beverages',
      'other',
    ];

    // Initialize groups in order
    for (const category of categoryOrder) {
      groups.set(category, []);
    }

    // Assign items to groups
    for (const item of items) {
      const category = item.category ?? 'other';
      const group = groups.get(category);
      if (group) {
        group.push(item);
      } else {
        // Fallback for unknown categories
        groups.get('other')!.push(item);
      }
    }

    // Remove empty groups
    for (const [category, categoryItems] of groups) {
      if (categoryItems.length === 0) {
        groups.delete(category);
      }
    }

    return groups;
  }
}
