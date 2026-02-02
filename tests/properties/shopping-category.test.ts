/**
 * Property Test: Shopping List Category Organization
 *
 * **Feature: sous-chef, Property 13: Shopping List Category Organization**
 * **Validates: Requirements 5.4**
 *
 * For any shopping list, all items SHALL be assigned to exactly one category,
 * and items SHALL be grouped by category when displayed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ShoppingService } from '../../src/services/shopping-service.js';
import { MenuService } from '../../src/services/menu-service.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { createDatabase, Database } from '../../src/db/database.js';
import {
  minimalRecipeInputArb,
  categoryArb,
  unitArb,
} from '../generators/recipe-generators.js';
import type { IngredientCategory } from '../../src/types/recipe.js';

const ALL_CATEGORIES: IngredientCategory[] = [
  'produce', 'meat', 'seafood', 'dairy', 'bakery',
  'frozen', 'pantry', 'spices', 'beverages', 'other',
];

describe('Property 13: Shopping List Category Organization', () => {
  let db: Database;
  let shoppingService: ShoppingService;
  let menuService: MenuService;
  let recipeService: RecipeService;

  beforeEach(async () => {
    db = await createDatabase();
    menuService = new MenuService(db);
    recipeService = new RecipeService(db);
    shoppingService = new ShoppingService(db, menuService, recipeService);
  });

  afterEach(() => {
    db.close();
  });

  it('should assign every item to exactly one valid category', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes
          const recipes = recipeInputs.map((input) => recipeService.createRecipe(input));
          const recipeIds = recipes.map((r) => r.id);

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes(recipeIds);

          // Every item should have exactly one valid category
          for (const item of shoppingList.items) {
            expect(item.category).toBeDefined();
            expect(ALL_CATEGORIES).toContain(item.category);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should group items by category with no item appearing in multiple groups', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes
          const recipes = recipeInputs.map((input) => recipeService.createRecipe(input));
          const recipeIds = recipes.map((r) => r.id);

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes(recipeIds);

          // Get items grouped by category
          const groupedItems = shoppingService.getItemsByCategory(shoppingList.id);

          // Collect all item IDs from groups
          const itemIdsInGroups = new Set<string>();
          let totalItemsInGroups = 0;

          for (const [category, items] of groupedItems) {
            // Category should be valid
            expect(ALL_CATEGORIES).toContain(category);

            for (const item of items) {
              // Item should have matching category
              expect(item.category).toBe(category);

              // Track item IDs
              itemIdsInGroups.add(item.id);
              totalItemsInGroups++;
            }
          }

          // No duplicates: total count should equal unique count
          expect(totalItemsInGroups).toBe(itemIdsInGroups.size);

          // All items should be in groups
          expect(itemIdsInGroups.size).toBe(shoppingList.items.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve item category from ingredient', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        categoryArb,
        (ingredientName, unit, quantity, category) => {
          // Create recipe with specific category
          const recipe = recipeService.createRecipe({
            title: 'Test Recipe',
            ingredients: [{ name: ingredientName, quantity, unit, category }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes([recipe.id]);

          // Find the item
          const item = shoppingList.items.find(
            (i) =>
              i.name.toLowerCase().trim() === ingredientName.toLowerCase().trim() &&
              i.unit === unit
          );

          expect(item).toBeDefined();
          expect(item!.category).toBe(category);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should default to "other" category when ingredient has no category', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName, unit, quantity) => {
          // Create recipe without category
          const recipe = recipeService.createRecipe({
            title: 'Test Recipe',
            ingredients: [{ name: ingredientName, quantity, unit }], // No category
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes([recipe.id]);

          // Find the item
          const item = shoppingList.items.find(
            (i) =>
              i.name.toLowerCase().trim() === ingredientName.toLowerCase().trim() &&
              i.unit === unit
          );

          expect(item).toBeDefined();
          expect(item!.category).toBe('other');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return only non-empty category groups', () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (category, ingredientName, unit, quantity) => {
          // Create recipe with single category
          const recipe = recipeService.createRecipe({
            title: 'Test Recipe',
            ingredients: [{ name: ingredientName, quantity, unit, category }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes([recipe.id]);

          // Get grouped items
          const groupedItems = shoppingService.getItemsByCategory(shoppingList.id);

          // Should only have one group (the category we used)
          expect(groupedItems.size).toBe(1);
          expect(groupedItems.has(category)).toBe(true);

          // That group should have exactly one item
          const items = groupedItems.get(category);
          expect(items).toBeDefined();
          expect(items!.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
