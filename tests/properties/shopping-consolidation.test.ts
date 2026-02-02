/**
 * Property Test: Shopping List Ingredient Consolidation
 *
 * **Feature: sous-chef, Property 12: Shopping List Ingredient Consolidation**
 * **Validates: Requirements 5.1, 5.2**
 *
 * For any set of recipes, generating a shopping list SHALL include every unique
 * ingredient from all recipes, and ingredients with the same name and compatible
 * units SHALL be combined with their quantities summed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ShoppingService } from '../../src/services/shopping-service.js';
import { MenuService } from '../../src/services/menu-service.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { createDatabase, Database } from '../../src/db/database.js';
import {
  minimalRecipeInputArb,
  ingredientInputArb,
  unitArb,
  categoryArb,
} from '../generators/recipe-generators.js';
import type { RecipeInput, IngredientInput } from '../../src/types/recipe.js';

describe('Property 12: Shopping List Ingredient Consolidation', () => {
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

  it('should include every unique ingredient from all recipes', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (recipeInputs) => {
          // Create recipes
          const recipes = recipeInputs.map((input) => recipeService.createRecipe(input));
          const recipeIds = recipes.map((r) => r.id);

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes(recipeIds);

          // Collect all unique ingredient keys (name|unit) from all recipes
          const expectedKeys = new Set<string>();
          for (const recipe of recipes) {
            for (const ingredient of recipe.ingredients) {
              const key = `${ingredient.name.toLowerCase().trim()}|${ingredient.unit}`;
              expectedKeys.add(key);
            }
          }

          // Verify all unique ingredients are in the shopping list
          const actualKeys = new Set(
            shoppingList.items.map((item) => `${item.name.toLowerCase().trim()}|${item.unit}`)
          );

          expect(actualKeys.size).toBe(expectedKeys.size);
          for (const key of expectedKeys) {
            expect(actualKeys.has(key)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should combine quantities for same ingredient with same unit', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.option(categoryArb, { nil: undefined }),
        (ingredientName, unit, quantity1, quantity2, category) => {
          // Create two recipes with the same ingredient
          const recipe1 = recipeService.createRecipe({
            title: 'Recipe 1',
            ingredients: [{ name: ingredientName, quantity: quantity1, unit, category }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          const recipe2 = recipeService.createRecipe({
            title: 'Recipe 2',
            ingredients: [{ name: ingredientName, quantity: quantity2, unit, category }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes([recipe1.id, recipe2.id]);

          // Should have exactly one item for this ingredient
          const matchingItems = shoppingList.items.filter(
            (item) =>
              item.name.toLowerCase().trim() === ingredientName.toLowerCase().trim() &&
              item.unit === unit
          );

          expect(matchingItems.length).toBe(1);

          // Quantity should be the sum
          const expectedQuantity = quantity1 + quantity2;
          expect(matchingItems[0]!.quantity).toBeCloseTo(expectedQuantity, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track which recipes need each ingredient', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName, unit, quantity) => {
          // Create two recipes with the same ingredient
          const recipe1 = recipeService.createRecipe({
            title: 'Recipe 1',
            ingredients: [{ name: ingredientName, quantity, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          const recipe2 = recipeService.createRecipe({
            title: 'Recipe 2',
            ingredients: [{ name: ingredientName, quantity, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes([recipe1.id, recipe2.id]);

          // Find the consolidated item
          const item = shoppingList.items.find(
            (i) =>
              i.name.toLowerCase().trim() === ingredientName.toLowerCase().trim() &&
              i.unit === unit
          );

          expect(item).toBeDefined();
          expect(item!.recipeIds).toContain(recipe1.id);
          expect(item!.recipeIds).toContain(recipe2.id);
          expect(item!.recipeIds.length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not combine ingredients with different units', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.tuple(unitArb, unitArb).filter(([u1, u2]) => u1 !== u2),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (ingredientName, [unit1, unit2], quantity1, quantity2) => {
          // Create two recipes with same ingredient but different units
          const recipe1 = recipeService.createRecipe({
            title: 'Recipe 1',
            ingredients: [{ name: ingredientName, quantity: quantity1, unit: unit1 }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          const recipe2 = recipeService.createRecipe({
            title: 'Recipe 2',
            ingredients: [{ name: ingredientName, quantity: quantity2, unit: unit2 }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: 4,
          });

          // Generate shopping list
          const shoppingList = shoppingService.generateFromRecipes([recipe1.id, recipe2.id]);

          // Should have two separate items (different units)
          const matchingItems = shoppingList.items.filter(
            (item) => item.name.toLowerCase().trim() === ingredientName.toLowerCase().trim()
          );

          expect(matchingItems.length).toBe(2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should scale quantities based on servings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        unitArb,
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 24 }),
        (ingredientName, unit, quantity, recipeServings, requestedServings) => {
          // Create recipe
          const recipe = recipeService.createRecipe({
            title: 'Test Recipe',
            ingredients: [{ name: ingredientName, quantity, unit }],
            instructions: [{ text: 'Step 1' }],
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            servings: recipeServings,
          });

          // Generate shopping list with custom servings
          const servingsMap = new Map([[recipe.id, requestedServings]]);
          const shoppingList = shoppingService.generateFromRecipes([recipe.id], servingsMap);

          // Find the item
          const item = shoppingList.items.find(
            (i) =>
              i.name.toLowerCase().trim() === ingredientName.toLowerCase().trim() &&
              i.unit === unit
          );

          expect(item).toBeDefined();

          // Quantity should be scaled
          const scaleFactor = requestedServings / recipeServings;
          const expectedQuantity = quantity * scaleFactor;
          expect(item!.quantity).toBeCloseTo(expectedQuantity, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
