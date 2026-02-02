/**
 * Property Test: Leftover Date Calculation
 *
 * **Feature: sous-chef, Property 10: Leftover Date Calculation**
 * **Validates: Requirements 4.3, 4.4, 10.3**
 *
 * For any recipe added to a menu with a cook date, the leftover expiration date
 * SHALL equal the cook date plus the recipe's configured leftover duration
 * (or the default duration if not configured).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MenuService } from '../../src/services/menu-service.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { createDatabase, Database } from '../../src/db/database.js';
import {
  minimalRecipeInputArb,
  menuInputArb,
  mealSlotArb,
  leftoverDurationArb,
  dateArb,
} from '../generators/recipe-generators.js';

describe('Property 10: Leftover Date Calculation', () => {
  let db: Database;
  let menuService: MenuService;
  let recipeService: RecipeService;

  beforeEach(async () => {
    db = await createDatabase();
    menuService = new MenuService(db);
    recipeService = new RecipeService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should calculate leftover expiry date as cook date plus duration days', () => {
    fc.assert(
      fc.property(
        dateArb,
        leftoverDurationArb,
        (cookDate, durationDays) => {
          // Calculate leftover date
          const leftoverDate = menuService.calculateLeftoverDate(cookDate, durationDays);

          // Expected: cook date + duration days
          const expectedDate = new Date(cookDate);
          expectedDate.setDate(expectedDate.getDate() + durationDays);

          // Verify the dates match (comparing date strings to avoid timezone issues)
          expect(leftoverDate.toISOString().split('T')[0]).toBe(
            expectedDate.toISOString().split('T')[0]
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use default duration (3 days) when not specified', () => {
    fc.assert(
      fc.property(dateArb, (cookDate) => {
        // Calculate leftover date without specifying duration
        const leftoverDate = menuService.calculateLeftoverDate(cookDate);

        // Expected: cook date + 3 days (default)
        const expectedDate = new Date(cookDate);
        expectedDate.setDate(expectedDate.getDate() + 3);

        expect(leftoverDate.toISOString().split('T')[0]).toBe(
          expectedDate.toISOString().split('T')[0]
        );
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly set leftover date when assigning recipe to menu', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        menuInputArb,
        mealSlotArb,
        leftoverDurationArb,
        (recipeInput, menuInput, mealSlot, leftoverDuration) => {
          // Create recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create menu
          const menu = menuService.createMenu(menuInput);

          // Pick a date within the menu range for assignment
          const assignmentDate = menu.startDate;
          const cookDate = assignmentDate;

          // Assign recipe with custom leftover duration
          const assignment = menuService.assignRecipe(menu.id, {
            recipeId: recipe.id,
            date: assignmentDate,
            mealSlot,
            cookDate,
            leftoverDurationDays: leftoverDuration,
          });

          // Verify leftover expiry date
          const expectedExpiry = new Date(cookDate);
          expectedExpiry.setDate(expectedExpiry.getDate() + leftoverDuration);

          expect(assignment.leftoverExpiryDate).toBeDefined();
          expect(assignment.leftoverExpiryDate!.toISOString().split('T')[0]).toBe(
            expectedExpiry.toISOString().split('T')[0]
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should recalculate leftover date when assignment is moved', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        menuInputArb,
        mealSlotArb,
        (recipeInput, menuInput, mealSlot) => {
          // Create recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create menu with at least 2 days range
          const startDate = new Date(menuInput.startDate);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7); // Ensure at least 7 days range

          const menu = menuService.createMenu({
            name: menuInput.name,
            startDate,
            endDate,
          });

          // Assign recipe to first day
          const assignment = menuService.assignRecipe(menu.id, {
            recipeId: recipe.id,
            date: startDate,
            mealSlot,
            cookDate: startDate,
          });

          // Move to a different date (3 days later)
          const newDate = new Date(startDate);
          newDate.setDate(newDate.getDate() + 3);

          const movedAssignment = menuService.moveAssignment(
            menu.id,
            assignment.id,
            newDate,
            undefined,
            newDate
          );

          // Verify leftover date was recalculated based on new cook date
          const expectedExpiry = new Date(newDate);
          expectedExpiry.setDate(expectedExpiry.getDate() + 3); // Default duration

          expect(movedAssignment.leftoverExpiryDate).toBeDefined();
          expect(movedAssignment.leftoverExpiryDate!.toISOString().split('T')[0]).toBe(
            expectedExpiry.toISOString().split('T')[0]
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve leftover calculation invariant: expiry >= cook date', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 0, max: 30 }),
        (cookDate, durationDays) => {
          const leftoverDate = menuService.calculateLeftoverDate(cookDate, durationDays);

          // Leftover date should always be >= cook date
          expect(leftoverDate.getTime()).toBeGreaterThanOrEqual(cookDate.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});
