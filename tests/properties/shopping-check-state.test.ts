/**
 * Property Test: Shopping Item Check State
 *
 * **Feature: sous-chef, Property 14: Shopping Item Check State**
 * **Validates: Requirements 5.3**
 *
 * For any shopping list item, checking it SHALL set its checked state to true,
 * and unchecking it SHALL set its checked state to false.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ShoppingService } from '../../src/services/shopping-service.js';
import { MenuService } from '../../src/services/menu-service.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { createDatabase, Database } from '../../src/db/database.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';

describe('Property 14: Shopping Item Check State', () => {
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

  it('should set checked state to true when checking an item', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe and shopping list
        const recipe = recipeService.createRecipe(recipeInput);
        const shoppingList = shoppingService.generateFromRecipes([recipe.id]);

        // All items should start unchecked
        for (const item of shoppingList.items) {
          expect(item.checked).toBe(false);
        }

        // Check each item
        for (const item of shoppingList.items) {
          shoppingService.checkItem(shoppingList.id, item.id);
        }

        // Verify all items are now checked
        const updatedList = shoppingService.getList(shoppingList.id);
        expect(updatedList).toBeDefined();
        for (const item of updatedList!.items) {
          expect(item.checked).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should set checked state to false when unchecking an item', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe and shopping list
        const recipe = recipeService.createRecipe(recipeInput);
        const shoppingList = shoppingService.generateFromRecipes([recipe.id]);

        // Check all items first
        for (const item of shoppingList.items) {
          shoppingService.checkItem(shoppingList.id, item.id);
        }

        // Verify all items are checked
        let checkedList = shoppingService.getList(shoppingList.id);
        for (const item of checkedList!.items) {
          expect(item.checked).toBe(true);
        }

        // Uncheck all items
        for (const item of checkedList!.items) {
          shoppingService.uncheckItem(shoppingList.id, item.id);
        }

        // Verify all items are now unchecked
        const uncheckedList = shoppingService.getList(shoppingList.id);
        expect(uncheckedList).toBeDefined();
        for (const item of uncheckedList!.items) {
          expect(item.checked).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should only affect the checked item, not others', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        (recipeInputs) => {
          // Create multiple recipes to get multiple items
          const recipes = recipeInputs.map((input) => recipeService.createRecipe(input));
          const recipeIds = recipes.map((r) => r.id);
          const shoppingList = shoppingService.generateFromRecipes(recipeIds);

          if (shoppingList.items.length < 2) {
            return; // Skip if not enough items
          }

          // Check only the first item
          const firstItem = shoppingList.items[0]!;
          shoppingService.checkItem(shoppingList.id, firstItem.id);

          // Verify only first item is checked
          const updatedList = shoppingService.getList(shoppingList.id);
          expect(updatedList).toBeDefined();

          for (const item of updatedList!.items) {
            if (item.id === firstItem.id) {
              expect(item.checked).toBe(true);
            } else {
              expect(item.checked).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be idempotent - checking twice has same effect as checking once', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe and shopping list
        const recipe = recipeService.createRecipe(recipeInput);
        const shoppingList = shoppingService.generateFromRecipes([recipe.id]);

        if (shoppingList.items.length === 0) {
          return; // Skip if no items
        }

        const item = shoppingList.items[0]!;

        // Check twice
        shoppingService.checkItem(shoppingList.id, item.id);
        shoppingService.checkItem(shoppingList.id, item.id);

        // Should still be checked
        const updatedList = shoppingService.getList(shoppingList.id);
        const updatedItem = updatedList!.items.find((i) => i.id === item.id);
        expect(updatedItem).toBeDefined();
        expect(updatedItem!.checked).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should be idempotent - unchecking twice has same effect as unchecking once', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe and shopping list
        const recipe = recipeService.createRecipe(recipeInput);
        const shoppingList = shoppingService.generateFromRecipes([recipe.id]);

        if (shoppingList.items.length === 0) {
          return; // Skip if no items
        }

        const item = shoppingList.items[0]!;

        // Check first, then uncheck twice
        shoppingService.checkItem(shoppingList.id, item.id);
        shoppingService.uncheckItem(shoppingList.id, item.id);
        shoppingService.uncheckItem(shoppingList.id, item.id);

        // Should still be unchecked
        const updatedList = shoppingService.getList(shoppingList.id);
        const updatedItem = updatedList!.items.find((i) => i.id === item.id);
        expect(updatedItem).toBeDefined();
        expect(updatedItem!.checked).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should toggle correctly: check then uncheck returns to original state', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe and shopping list
        const recipe = recipeService.createRecipe(recipeInput);
        const shoppingList = shoppingService.generateFromRecipes([recipe.id]);

        if (shoppingList.items.length === 0) {
          return; // Skip if no items
        }

        const item = shoppingList.items[0]!;
        const originalState = item.checked;

        // Toggle: check then uncheck
        shoppingService.checkItem(shoppingList.id, item.id);
        shoppingService.uncheckItem(shoppingList.id, item.id);

        // Should be back to original state (false)
        const updatedList = shoppingService.getList(shoppingList.id);
        const updatedItem = updatedList!.items.find((i) => i.id === item.id);
        expect(updatedItem).toBeDefined();
        expect(updatedItem!.checked).toBe(originalState);
      }),
      { numRuns: 100 }
    );
  });
});
