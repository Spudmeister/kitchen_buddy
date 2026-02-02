/**
 * Property Test: Export/Import Round-Trip
 * 
 * **Feature: sous-chef, Property 18: Export/Import Round-Trip**
 * **Validates: Requirements 8.3, 9.9**
 * 
 * For any recipe (or set of recipes), exporting to JSON and then importing
 * SHALL produce equivalent recipes with all data preserved.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { ExportService } from '../../src/services/export-service.js';
import { StatisticsService } from '../../src/services/statistics-service.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';
import type { Recipe } from '../../src/types/recipe.js';

describe('Property 18: Export/Import Round-Trip', () => {
  let db: Database;
  let recipeService: RecipeService;
  let exportService: ExportService;

  beforeEach(async () => {
    // Create fresh in-memory database for each test
    db = await createDatabase();
    recipeService = new RecipeService(db);
    exportService = new ExportService(db);
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Helper to compare two recipes for equivalence
   */
  function assertRecipesEquivalent(original: Recipe, imported: Recipe): void {
    // Title
    expect(imported.title).toBe(original.title);

    // Description
    expect(imported.description).toBe(original.description);

    // Prep and cook times
    expect(imported.prepTime.minutes).toBe(original.prepTime.minutes);
    expect(imported.cookTime.minutes).toBe(original.cookTime.minutes);

    // Servings
    expect(imported.servings).toBe(original.servings);

    // Source URL
    expect(imported.sourceUrl).toBe(original.sourceUrl);

    // Ingredients count and content
    expect(imported.ingredients.length).toBe(original.ingredients.length);
    for (let i = 0; i < original.ingredients.length; i++) {
      const origIng = original.ingredients[i]!;
      const impIng = imported.ingredients[i]!;
      
      expect(impIng.name).toBe(origIng.name);
      expect(impIng.quantity).toBeCloseTo(origIng.quantity, 5);
      expect(impIng.unit).toBe(origIng.unit);
      expect(impIng.notes).toBe(origIng.notes);
      expect(impIng.category).toBe(origIng.category);
    }

    // Instructions count and content
    expect(imported.instructions.length).toBe(original.instructions.length);
    for (let i = 0; i < original.instructions.length; i++) {
      const origInst = original.instructions[i]!;
      const impInst = imported.instructions[i]!;
      
      expect(impInst.text).toBe(origInst.text);
      expect(impInst.step).toBe(origInst.step);
      
      if (origInst.duration !== undefined) {
        expect(impInst.duration?.minutes).toBe(origInst.duration.minutes);
      } else {
        expect(impInst.duration).toBeUndefined();
      }
      
      expect(impInst.notes).toBe(origInst.notes);
    }

    // Tags (sorted for comparison)
    expect([...imported.tags].sort()).toEqual([...original.tags].sort());
  }

  it('should preserve single recipe data through export/import cycle', async () => {
    await fc.assert(
      fc.asyncProperty(minimalRecipeInputArb, async (recipeInput) => {
        // Create the recipe
        const created = recipeService.createRecipe(recipeInput);
        
        // Export the recipe
        const exported = exportService.exportRecipe(created.id);
        
        // Verify export structure
        expect(exported.version).toBe('1.0');
        expect(exported.recipes.length).toBe(1);
        
        // Create a new database for import
        const importDb = await createDatabase();
        const importExportService = new ExportService(importDb);
        
        try {
          // Import the exported data
          const importResult = importExportService.importRecipes(exported);
          
          // Verify import succeeded
          expect(importResult.recipesImported).toBe(1);
          expect(importResult.errors.length).toBe(0);
          expect(importResult.importedRecipeIds.length).toBe(1);
          
          // Get the imported recipe
          const importRecipeService = new RecipeService(importDb);
          const importedRecipe = importRecipeService.getRecipe(importResult.importedRecipeIds[0]!);
          
          expect(importedRecipe).toBeDefined();
          
          // Compare with original
          assertRecipesEquivalent(created, importedRecipe!);
        } finally {
          importDb.close();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve multiple recipes through export/import cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        async (recipeInputs) => {
          // Create a fresh database for this test iteration
          const testDb = await createDatabase();
          const testRecipeService = new RecipeService(testDb);
          const testExportService = new ExportService(testDb);
          
          try {
            // Create all recipes
            const createdRecipes = recipeInputs.map(input => testRecipeService.createRecipe(input));
            
            // Export all recipes
            const exported = testExportService.exportAll();
            
            // Verify export structure
            expect(exported.version).toBe('1.0');
            expect(exported.recipes.length).toBe(createdRecipes.length);
            
            // Create a new database for import
            const importDb = await createDatabase();
            const importExportService = new ExportService(importDb);
            
            try {
              // Import the exported data
              const importResult = importExportService.importRecipes(exported);
              
              // Verify import succeeded
              expect(importResult.recipesImported).toBe(createdRecipes.length);
              expect(importResult.errors.length).toBe(0);
              
              // Get all imported recipes
              const importRecipeService = new RecipeService(importDb);
              const importedRecipes = importResult.importedRecipeIds.map(id => 
                importRecipeService.getRecipe(id)
              ).filter((r): r is Recipe => r !== undefined);
              
              expect(importedRecipes.length).toBe(createdRecipes.length);
              
              // Compare each recipe by title (since IDs change on import)
              for (const original of createdRecipes) {
                const imported = importedRecipes.find(r => r.title === original.title);
                expect(imported).toBeDefined();
                assertRecipesEquivalent(original, imported!);
              }
            } finally {
              importDb.close();
            }
          } finally {
            testDb.close();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should preserve recipe rating through export/import cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        minimalRecipeInputArb,
        fc.integer({ min: 1, max: 5 }),
        async (recipeInput, rating) => {
          // Create the recipe
          const created = recipeService.createRecipe(recipeInput);
          
          // Add a rating
          const statsService = new StatisticsService(db);
          statsService.rateRecipe({ recipeId: created.id, rating });
          
          // Export with ratings
          const exported = exportService.exportRecipe(created.id, { includeRatings: true });
          
          // Verify export includes ratings
          expect(exported.ratings).toBeDefined();
          expect(exported.ratings!.length).toBeGreaterThan(0);
          
          // Create a new database for import
          const importDb = await createDatabase();
          const importExportService = new ExportService(importDb);
          
          try {
            // Import the exported data
            const importResult = importExportService.importRecipes(exported);
            
            // Verify import succeeded
            expect(importResult.recipesImported).toBe(1);
            expect(importResult.ratingsImported).toBeGreaterThan(0);
            
            // Get the imported recipe and verify rating
            const importRecipeService = new RecipeService(importDb);
            const importedRecipe = importRecipeService.getRecipe(importResult.importedRecipeIds[0]!);
            
            expect(importedRecipe).toBeDefined();
            expect(importedRecipe!.rating).toBe(rating);
          } finally {
            importDb.close();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
