/**
 * Property Test: Recipe Versioning Preserves History
 *
 * **Feature: sous-chef, Property 2: Recipe Versioning Preserves History**
 * **Validates: Requirements 1.2, 1.3**
 *
 * For any recipe and any sequence of edits, each edit SHALL create a new version,
 * and all previous versions SHALL remain retrievable. The version count SHALL equal
 * the number of edits plus one (for the original).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';
import type { RecipeInput } from '../../src/types/recipe.js';

describe('Property 2: Recipe Versioning Preserves History', () => {
  let db: Database;
  let service: RecipeService;

  beforeEach(async () => {
    db = await createDatabase();
    service = new RecipeService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should create a new version on each edit and preserve all previous versions', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        (initialInput, edits) => {
          // Create initial recipe
          const created = service.createRecipe(initialInput);
          expect(created.currentVersion).toBe(1);

          // Apply each edit
          let currentRecipe = created;
          for (let i = 0; i < edits.length; i++) {
            currentRecipe = service.updateRecipe(currentRecipe.id, edits[i]!);
            
            // Version should increment by 1 for each edit
            expect(currentRecipe.currentVersion).toBe(i + 2);
          }

          // Get version history
          const history = service.getVersionHistory(created.id);

          // Version count should equal edits + 1 (original)
          expect(history.length).toBe(edits.length + 1);

          // All versions should be retrievable
          for (let v = 1; v <= history.length; v++) {
            const versionedRecipe = service.getRecipe(created.id, v);
            expect(versionedRecipe).toBeDefined();
            expect(versionedRecipe!.currentVersion).toBe(history.length); // currentVersion is always latest
          }

          // Verify version numbers are sequential
          for (let i = 0; i < history.length; i++) {
            expect(history[i]!.version).toBe(i + 1);
          }

          // Verify first version matches initial input
          const firstVersion = history[0]!;
          expect(firstVersion.title).toBe(initialInput.title);
          expect(firstVersion.ingredients.length).toBe(initialInput.ingredients.length);
          expect(firstVersion.instructions.length).toBe(initialInput.instructions.length);

          // Verify last version matches last edit
          const lastVersion = history[history.length - 1]!;
          const lastEdit = edits[edits.length - 1]!;
          expect(lastVersion.title).toBe(lastEdit.title);
          expect(lastVersion.ingredients.length).toBe(lastEdit.ingredients.length);
          expect(lastVersion.instructions.length).toBe(lastEdit.instructions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow restoration of any previous version', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 4 }),
        fc.integer({ min: 1, max: 100 }),
        (initialInput, edits, versionSeed) => {
          // Create initial recipe and apply edits
          const created = service.createRecipe(initialInput);
          let currentRecipe = created;
          for (const edit of edits) {
            currentRecipe = service.updateRecipe(currentRecipe.id, edit);
          }

          const totalVersions = edits.length + 1;
          const versionToRestore = (versionSeed % totalVersions) + 1;

          // Get the version data before restoration
          const historyBefore = service.getVersionHistory(created.id);
          const versionData = historyBefore[versionToRestore - 1]!;

          // Restore to a previous version
          const restored = service.restoreVersion(created.id, versionToRestore);

          // Restoration creates a new version
          expect(restored.currentVersion).toBe(totalVersions + 1);

          // Restored recipe should have same content as the version we restored
          expect(restored.title).toBe(versionData.title);
          expect(restored.ingredients.length).toBe(versionData.ingredients.length);
          expect(restored.instructions.length).toBe(versionData.instructions.length);

          // All previous versions should still be retrievable
          const historyAfter = service.getVersionHistory(created.id);
          expect(historyAfter.length).toBe(totalVersions + 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
