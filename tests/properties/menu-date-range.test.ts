/**
 * Property Test: Menu Date Range Support
 *
 * **Feature: sous-chef, Property 11: Menu Date Range Support**
 * **Validates: Requirements 4.5**
 *
 * For any valid date range (start date before or equal to end date), a menu
 * SHALL be creatable and SHALL accept recipe assignments for any date within that range.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { MenuService } from '../../src/services/menu-service.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { createDatabase, Database } from '../../src/db/database.js';
import {
  minimalRecipeInputArb,
  mealSlotArb,
} from '../generators/recipe-generators.js';

/**
 * Helper to create a date-only Date (midnight UTC)
 */
function dateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Generator for a date-only value (no time component)
 * Generates dates between 2025-01-01 and 2026-12-31
 */
const dateOnlyArb = fc.tuple(
  fc.integer({ min: 2025, max: 2026 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 }) // Use 28 to avoid month-end issues
).map(([year, month, day]) => dateOnly(year, month, day));

/**
 * Generator for a valid date range where start <= end (date-only)
 */
const validDateRangeArb = fc.tuple(dateOnlyArb, dateOnlyArb).map(([d1, d2]) => {
  const start = d1 <= d2 ? d1 : d2;
  const end = d1 <= d2 ? d2 : d1;
  return { startDate: start, endDate: end };
});

/**
 * Generator for menu name
 */
const menuNameArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

describe('Property 11: Menu Date Range Support', () => {
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

  it('should create menu for any valid date range (start <= end)', () => {
    fc.assert(
      fc.property(
        menuNameArb,
        validDateRangeArb,
        (name, { startDate, endDate }) => {
          // Create menu with valid date range
          const menu = menuService.createMenu({
            name,
            startDate,
            endDate,
          });

          // Verify menu was created with correct dates
          expect(menu.id).toBeDefined();
          expect(menu.name).toBe(name);
          expect(menu.startDate.toISOString().split('T')[0]).toBe(
            startDate.toISOString().split('T')[0]
          );
          expect(menu.endDate.toISOString().split('T')[0]).toBe(
            endDate.toISOString().split('T')[0]
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept single-day menus (start == end)', () => {
    fc.assert(
      fc.property(
        menuNameArb,
        dateOnlyArb,
        (name, date) => {
          // Create single-day menu
          const menu = menuService.createMenu({
            name,
            startDate: date,
            endDate: date,
          });

          // Verify menu was created
          expect(menu.id).toBeDefined();
          expect(menu.startDate.toISOString().split('T')[0]).toBe(
            menu.endDate.toISOString().split('T')[0]
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject menus with invalid date range (start > end)', () => {
    fc.assert(
      fc.property(
        menuNameArb,
        fc.tuple(dateOnlyArb, dateOnlyArb).filter(([d1, d2]) => d1 > d2),
        (name, [startDate, endDate]) => {
          // Attempt to create menu with invalid date range
          expect(() => {
            menuService.createMenu({
              name,
              startDate,
              endDate,
            });
          }).toThrow('Start date must be before or equal to end date');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept recipe assignments for any date within menu range', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        menuNameArb,
        validDateRangeArb,
        mealSlotArb,
        (recipeInput, menuName, { startDate, endDate }, mealSlot) => {
          // Create recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create menu
          const menu = menuService.createMenu({
            name: menuName,
            startDate,
            endDate,
          });

          // Use the start date for assignment (guaranteed to be within range)
          const assignmentDate = new Date(startDate);

          // Assign recipe to a date within range
          const assignment = menuService.assignRecipe(menu.id, {
            recipeId: recipe.id,
            date: assignmentDate,
            mealSlot,
          });

          // Verify assignment was created
          expect(assignment.id).toBeDefined();
          expect(assignment.menuId).toBe(menu.id);
          expect(assignment.recipeId).toBe(recipe.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept assignments at start and end boundaries', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        menuNameArb,
        validDateRangeArb,
        mealSlotArb,
        (recipeInput, menuName, { startDate, endDate }, mealSlot) => {
          // Create recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create menu
          const menu = menuService.createMenu({
            name: menuName,
            startDate,
            endDate,
          });

          // Assign at start date
          const startAssignment = menuService.assignRecipe(menu.id, {
            recipeId: recipe.id,
            date: new Date(startDate),
            mealSlot,
          });
          expect(startAssignment.id).toBeDefined();

          // Assign at end date (different meal slot to avoid conflict)
          const endMealSlot = mealSlot === 'dinner' ? 'lunch' : 'dinner';
          const endAssignment = menuService.assignRecipe(menu.id, {
            recipeId: recipe.id,
            date: new Date(endDate),
            mealSlot: endMealSlot,
          });
          expect(endAssignment.id).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject assignments outside menu date range', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        menuNameArb,
        validDateRangeArb,
        mealSlotArb,
        fc.integer({ min: 1, max: 30 }),
        (recipeInput, menuName, { startDate, endDate }, mealSlot, daysOutside) => {
          // Create recipe
          const recipe = recipeService.createRecipe(recipeInput);

          // Create menu
          const menu = menuService.createMenu({
            name: menuName,
            startDate,
            endDate,
          });

          // Try to assign before start date
          const beforeStart = new Date(startDate);
          beforeStart.setDate(beforeStart.getDate() - daysOutside);

          expect(() => {
            menuService.assignRecipe(menu.id, {
              recipeId: recipe.id,
              date: beforeStart,
              mealSlot,
            });
          }).toThrow('Assignment date must be within menu date range');

          // Try to assign after end date
          const afterEnd = new Date(endDate);
          afterEnd.setDate(afterEnd.getDate() + daysOutside);

          expect(() => {
            menuService.assignRecipe(menu.id, {
              recipeId: recipe.id,
              date: afterEnd,
              mealSlot,
            });
          }).toThrow('Assignment date must be within menu date range');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should support menus spanning any number of days', () => {
    fc.assert(
      fc.property(
        menuNameArb,
        dateOnlyArb,
        fc.integer({ min: 0, max: 365 }),
        (name, startDate, daysSpan) => {
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + daysSpan);

          // Create menu spanning specified days
          const menu = menuService.createMenu({
            name,
            startDate,
            endDate,
          });

          // Verify menu was created successfully
          expect(menu.id).toBeDefined();
          expect(menu.name).toBe(name);
          
          // Verify the menu end date is at or after start date
          expect(menu.endDate.getTime()).toBeGreaterThanOrEqual(menu.startDate.getTime());
          
          // Verify the dates were stored correctly (comparing date strings)
          expect(menu.startDate.toISOString().split('T')[0]).toBe(
            startDate.toISOString().split('T')[0]
          );
          expect(menu.endDate.toISOString().split('T')[0]).toBe(
            endDate.toISOString().split('T')[0]
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
