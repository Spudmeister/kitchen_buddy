/**
 * Property Test: Cook Session Recording
 * 
 * **Feature: sous-chef, Property 21: Cook Session Recording**
 * **Validates: Requirements 12.1**
 * 
 * For any cook session logged with prep time and cook time, the session SHALL be
 * stored and retrievable, and SHALL be associated with the correct recipe.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { minimalRecipeInputArb, cookSessionInputArb } from '../generators/recipe-generators.js';

describe('Property 21: Cook Session Recording', () => {
  let db: Database;
  let recipeService: RecipeService;
  let statsService: StatisticsService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    statsService = new StatisticsService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should store and retrieve cook sessions with all fields preserved', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create a recipe first
        const recipe = recipeService.createRecipe(recipeInput);

        // Generate and log a cook session
        return fc.assert(
          fc.property(cookSessionInputArb(recipe.id), (sessionInput) => {
            // Log the cook session
            const session = statsService.logCookSession(sessionInput);

            // Retrieve the session
            const retrieved = statsService.getCookSession(session.id);

            // Verify it exists
            expect(retrieved).toBeDefined();

            // Verify all fields are preserved
            expect(retrieved!.id).toBe(session.id);
            expect(retrieved!.recipeId).toBe(sessionInput.recipeId);
            expect(retrieved!.date.toISOString()).toBe(sessionInput.date.toISOString());
            expect(retrieved!.servingsMade).toBe(sessionInput.servingsMade);
            expect(retrieved!.notes).toBe(sessionInput.notes);

            // Verify prep time
            if (sessionInput.actualPrepMinutes !== undefined) {
              expect(retrieved!.actualPrepTime?.minutes).toBe(sessionInput.actualPrepMinutes);
            } else {
              expect(retrieved!.actualPrepTime).toBeUndefined();
            }

            // Verify cook time
            if (sessionInput.actualCookMinutes !== undefined) {
              expect(retrieved!.actualCookTime?.minutes).toBe(sessionInput.actualCookMinutes);
            } else {
              expect(retrieved!.actualCookTime).toBeUndefined();
            }
          }),
          { numRuns: 10 }
        );
      }),
      { numRuns: 10 }
    );
  });

  it('should associate cook sessions with the correct recipe', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        (recipeInputs) => {
          // Create multiple recipes
          const recipes = recipeInputs.map(input => recipeService.createRecipe(input));

          // Log sessions for each recipe
          const sessionsByRecipe = new Map<string, string[]>();
          
          for (const recipe of recipes) {
            const sessionIds: string[] = [];
            // Log 1-3 sessions per recipe
            const numSessions = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numSessions; i++) {
              const session = statsService.logCookSession({
                recipeId: recipe.id,
                date: new Date(),
                servingsMade: 4,
              });
              sessionIds.push(session.id);
            }
            sessionsByRecipe.set(recipe.id, sessionIds);
          }

          // Verify each recipe's sessions are correctly associated
          for (const recipe of recipes) {
            const sessions = statsService.getCookSessionsForRecipe(recipe.id);
            const expectedIds = sessionsByRecipe.get(recipe.id)!;
            
            expect(sessions.length).toBe(expectedIds.length);
            
            for (const session of sessions) {
              expect(session.recipeId).toBe(recipe.id);
              expect(expectedIds).toContain(session.id);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should return sessions in descending date order', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        const recipe = recipeService.createRecipe(recipeInput);

        // Log sessions with different dates
        const dates = [
          new Date('2025-01-01'),
          new Date('2025-06-15'),
          new Date('2025-03-10'),
          new Date('2025-12-25'),
        ];

        for (const date of dates) {
          statsService.logCookSession({
            recipeId: recipe.id,
            date,
            servingsMade: 4,
          });
        }

        // Retrieve sessions
        const sessions = statsService.getCookSessionsForRecipe(recipe.id);

        // Verify they are in descending date order
        for (let i = 1; i < sessions.length; i++) {
          expect(sessions[i - 1]!.date.getTime()).toBeGreaterThanOrEqual(sessions[i]!.date.getTime());
        }
      }),
      { numRuns: 20 }
    );
  });
});
