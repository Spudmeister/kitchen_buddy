/**
 * Property Test: Soft Delete Preserves Data
 *
 * **Feature: sous-chef, Property 3: Soft Delete Preserves Data**
 * **Validates: Requirements 1.4**
 *
 * For any recipe that is deleted, the recipe SHALL still exist in storage
 * with an archived flag set, and SHALL be restorable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';

describe('Property 3: Soft Delete Preserves Data', () => {
  let db: Database;
  let service: RecipeService;

  beforeEach(async () => {
    db = await createDatabase();
    service = new RecipeService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should preserve recipe data after archiving and allow restoration', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create a recipe
        const created = service.createRecipe(recipeInput);
        const recipeId = created.id;

        // Verify recipe exists and is not archived
        expect(service.exists(recipeId)).toBe(true);
        expect(service.isArchived(recipeId)).toBe(false);

        // Archive the recipe
        service.archiveRecipe(recipeId);

        // Recipe should still exist in storage
        expect(service.exists(recipeId)).toBe(true);

        // Recipe should be marked as archived
        expect(service.isArchived(recipeId)).toBe(true);

        // Recipe data should still be retrievable
        const archivedRecipe = service.getRecipe(recipeId);
        expect(archivedRecipe).toBeDefined();
        expect(archivedRecipe!.archivedAt).toBeDefined();
        expect(archivedRecipe!.title).toBe(recipeInput.title);
        expect(archivedRecipe!.ingredients.length).toBe(recipeInput.ingredients.length);
        expect(archivedRecipe!.instructions.length).toBe(recipeInput.instructions.length);

        // Restore the recipe
        service.unarchiveRecipe(recipeId);

        // Recipe should no longer be archived
        expect(service.isArchived(recipeId)).toBe(false);

        // Recipe data should be intact
        const restoredRecipe = service.getRecipe(recipeId);
        expect(restoredRecipe).toBeDefined();
        expect(restoredRecipe!.archivedAt).toBeUndefined();
        expect(restoredRecipe!.title).toBe(recipeInput.title);
        expect(restoredRecipe!.ingredients.length).toBe(recipeInput.ingredients.length);
        expect(restoredRecipe!.instructions.length).toBe(recipeInput.instructions.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all version history after archiving', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 3 }),
        (initialInput, edits) => {
          // Create recipe and apply edits
          const created = service.createRecipe(initialInput);
          let currentRecipe = created;
          for (const edit of edits) {
            currentRecipe = service.updateRecipe(currentRecipe.id, edit);
          }

          const expectedVersionCount = edits.length + 1;

          // Archive the recipe
          service.archiveRecipe(currentRecipe.id);

          // Version history should still be accessible
          const history = service.getVersionHistory(currentRecipe.id);
          expect(history.length).toBe(expectedVersionCount);

          // All versions should still be retrievable
          for (let v = 1; v <= expectedVersionCount; v++) {
            const versionedRecipe = service.getRecipe(currentRecipe.id, v);
            expect(versionedRecipe).toBeDefined();
          }

          // Restore and verify history is still intact
          service.unarchiveRecipe(currentRecipe.id);
          const historyAfterRestore = service.getVersionHistory(currentRecipe.id);
          expect(historyAfterRestore.length).toBe(expectedVersionCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
