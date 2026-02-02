/**
 * Shopping Service - Business logic for shopping list generation
 *
 * Provides shopping list generation from menus and recipes with
 * ingredient consolidation and category organization.
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type { ShoppingList, ShoppingItem, CustomItemInput } from '../types/shopping.js';
import type { Unit } from '../types/units.js';
import type { IngredientCategory, Ingredient } from '../types/recipe.js';
import { MenuService } from './menu-service.js';
import { RecipeService } from './recipe-service.js';

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
    private db: Database,
    private menuService: MenuService,
    private recipeService: RecipeService
  ) {}

  /**
   * Generate a shopping list from a menu
   * Requirements: 5.1 - Consolidate all ingredients from selected recipes
   */
  generateFromMenu(menuId: string): ShoppingList {
    const menu = this.menuService.getMenu(menuId);
    if (!menu) {
      throw new Error(`Menu not found: ${menuId}`);
    }

    // Collect all recipe IDs and their servings/cook dates from assignments
    const recipeData = new Map<string, { servings: number; cookDate: Date }>();
    
    for (const assignment of menu.assignments) {
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
   * Requirements: 5.1 - Consolidate all ingredients from selected recipes
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
    const listRow = this.db.get<[string, string | null, string]>(
      'SELECT id, menu_id, created_at FROM shopping_lists WHERE id = ?',
      [id]
    );

    if (!listRow) {
      return undefined;
    }

    const [listId, menuId, createdAt] = listRow;
    const items = this.getItems(listId);

    return {
      id: listId,
      menuId: menuId ?? undefined,
      items,
      createdAt: new Date(createdAt),
    };
  }

  /**
   * Check an item (mark as purchased)
   * Requirements: 5.3 - Mark item as purchased
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
   * Requirements: 5.3 - Mark item as not purchased
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

    // Store recipe IDs (empty for custom items)
    // Custom items don't have recipe associations

    return {
      id: itemId,
      listId,
      name: input.name,
      quantity,
      unit,
      category,
      checked: false,
      recipeIds: [],
    };
  }

  /**
   * Export shopping list to plain text
   */
  exportToText(listId: string): string {
    const list = this.getList(listId);
    if (!list) {
      throw new Error(`Shopping list not found: ${listId}`);
    }

    // Group items by category
    const byCategory = this.groupByCategory(list.items);
    
    const lines: string[] = ['Shopping List', '='.repeat(40), ''];

    for (const [category, items] of byCategory) {
      lines.push(`## ${this.formatCategory(category)}`);
      for (const item of items) {
        const checkbox = item.checked ? '[x]' : '[ ]';
        const quantityStr = item.quantity !== 1 || item.unit !== 'piece'
          ? `${item.quantity} ${item.unit} `
          : '';
        lines.push(`${checkbox} ${quantityStr}${item.name}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Delete a shopping list
   */
  deleteList(id: string): void {
    const list = this.getList(id);
    if (!list) {
      throw new Error(`Shopping list not found: ${id}`);
    }

    this.db.transaction(() => {
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
    });
  }


  // Private helper methods

  /**
   * Internal method to generate a shopping list with consolidation
   * Requirements: 5.2 - Combine quantities for same ingredients
   */
  private generateListInternal(
    recipeData: Map<string, { servings: number; cookDate?: Date }>,
    menuId?: string
  ): ShoppingList {
    const listId = uuidv4();
    const now = new Date().toISOString();

    // Consolidate ingredients across all recipes
    const consolidated = this.consolidateIngredients(recipeData);

    return this.db.transaction(() => {
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
    });
  }

  /**
   * Consolidate ingredients from multiple recipes
   * Requirements: 5.2 - Combine same ingredients, sum quantities
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
        checked: (row[6] as number) === 1,
        recipeIds,
        cookByDate: row[7] ? new Date(row[7] as string) : undefined,
      };
    });
  }

  /**
   * Get a single item by ID
   */
  private getItem(itemId: string): ShoppingItem | undefined {
    const row = this.db.get<[string, string, string, number, string, string, number, string | null]>(
      `SELECT id, list_id, name, quantity, unit, category, checked, cook_by_date
       FROM shopping_items WHERE id = ?`,
      [itemId]
    );

    if (!row) {
      return undefined;
    }

    const recipeIds = this.getItemRecipeIds(itemId);

    return {
      id: row[0],
      listId: row[1],
      name: row[2],
      quantity: row[3],
      unit: row[4] as Unit,
      category: (row[5] as IngredientCategory) ?? 'other',
      checked: row[6] === 1,
      recipeIds,
      cookByDate: row[7] ? new Date(row[7]) : undefined,
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
   * Requirements: 5.4 - Organize items by category
   */
  private groupByCategory(items: ShoppingItem[]): Map<IngredientCategory, ShoppingItem[]> {
    const groups = new Map<IngredientCategory, ShoppingItem[]>();
    
    // Define category order for display
    const categoryOrder: IngredientCategory[] = [
      'produce', 'meat', 'seafood', 'dairy', 'bakery',
      'frozen', 'pantry', 'spices', 'beverages', 'other',
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

  /**
   * Format category name for display
   */
  private formatCategory(category: IngredientCategory): string {
    const names: Record<IngredientCategory, string> = {
      produce: 'Produce',
      meat: 'Meat',
      seafood: 'Seafood',
      dairy: 'Dairy',
      bakery: 'Bakery',
      frozen: 'Frozen',
      pantry: 'Pantry',
      spices: 'Spices',
      beverages: 'Beverages',
      other: 'Other',
    };
    return names[category] ?? 'Other';
  }

  /**
   * Get items grouped by category
   * Requirements: 5.4 - Items grouped by category when displayed
   */
  getItemsByCategory(listId: string): Map<IngredientCategory, ShoppingItem[]> {
    const list = this.getList(listId);
    if (!list) {
      throw new Error(`Shopping list not found: ${listId}`);
    }
    return this.groupByCategory(list.items);
  }
}
