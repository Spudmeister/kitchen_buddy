/**
 * Property Test: Folder Export Completeness
 * 
 * **Feature: sous-chef, Property 19: Folder Export Completeness**
 * **Validates: Requirements 8.4, 9.8**
 * 
 * For any folder containing recipes, exporting the folder SHALL include
 * all recipes in that folder in the export.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { ExportService } from '../../src/services/export-service.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';

describe('Property 19: Folder Export Completeness', () => {
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
   * Generator for folder name
   */
  const folderNameArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => s.trim().length > 0);

  it('should export all recipes in a folder', async () => {
    await fc.assert(
      fc.asyncProperty(
        folderNameArb,
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        async (folderName, recipeInputs) => {
          // Create a folder
          const folder = exportService.createFolder(folderName);
          
          // Create recipes and move them to the folder
          const createdRecipes = recipeInputs.map(input => {
            const recipe = recipeService.createRecipe(input);
            exportService.moveToFolder(recipe.id, folder.id);
            return recipe;
          });
          
          // Export the folder
          const exported = exportService.exportFolder(folder.id);
          
          // Verify export structure
          expect(exported.version).toBe('1.0');
          expect(exported.folder).toBeDefined();
          expect(exported.folder.id).toBe(folder.id);
          expect(exported.folder.name).toBe(folderName);
          
          // Verify all recipes are included
          expect(exported.recipes.length).toBe(createdRecipes.length);
          
          // Verify each recipe is in the export (find by ID, not title, since titles may be duplicated)
          for (const original of createdRecipes) {
            const exportedRecipe = exported.recipes.find(r => r.id === original.id);
            expect(exportedRecipe).toBeDefined();
            expect(exportedRecipe!.title).toBe(original.title);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should only export recipes in the specified folder', async () => {
    await fc.assert(
      fc.asyncProperty(
        folderNameArb,
        folderNameArb,
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 3 }),
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 3 }),
        async (folderName1, folderName2, recipesForFolder1, recipesForFolder2) => {
          // Create two folders
          const folder1 = exportService.createFolder(folderName1);
          const folder2 = exportService.createFolder(folderName2);
          
          // Create recipes in folder 1
          const recipesInFolder1 = recipesForFolder1.map(input => {
            const recipe = recipeService.createRecipe(input);
            exportService.moveToFolder(recipe.id, folder1.id);
            return recipe;
          });
          
          // Create recipes in folder 2
          const recipesInFolder2 = recipesForFolder2.map(input => {
            const recipe = recipeService.createRecipe(input);
            exportService.moveToFolder(recipe.id, folder2.id);
            return recipe;
          });
          
          // Export folder 1
          const exported1 = exportService.exportFolder(folder1.id);
          
          // Verify only folder 1 recipes are included
          expect(exported1.recipes.length).toBe(recipesInFolder1.length);
          
          // Verify folder 1 recipes are present
          for (const recipe of recipesInFolder1) {
            const found = exported1.recipes.find(r => r.id === recipe.id);
            expect(found).toBeDefined();
          }
          
          // Verify folder 2 recipes are NOT present
          for (const recipe of recipesInFolder2) {
            const found = exported1.recipes.find(r => r.id === recipe.id);
            expect(found).toBeUndefined();
          }
          
          // Export folder 2
          const exported2 = exportService.exportFolder(folder2.id);
          
          // Verify only folder 2 recipes are included
          expect(exported2.recipes.length).toBe(recipesInFolder2.length);
          
          // Verify folder 2 recipes are present
          for (const recipe of recipesInFolder2) {
            const found = exported2.recipes.find(r => r.id === recipe.id);
            expect(found).toBeDefined();
          }
          
          // Verify folder 1 recipes are NOT present
          for (const recipe of recipesInFolder1) {
            const found = exported2.recipes.find(r => r.id === recipe.id);
            expect(found).toBeUndefined();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should export empty folder with no recipes', async () => {
    await fc.assert(
      fc.asyncProperty(
        folderNameArb,
        async (folderName) => {
          // Create an empty folder
          const folder = exportService.createFolder(folderName);
          
          // Export the folder
          const exported = exportService.exportFolder(folder.id);
          
          // Verify export structure
          expect(exported.version).toBe('1.0');
          expect(exported.folder).toBeDefined();
          expect(exported.folder.id).toBe(folder.id);
          expect(exported.folder.name).toBe(folderName);
          
          // Verify no recipes are included
          expect(exported.recipes.length).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not include archived recipes in folder export', async () => {
    await fc.assert(
      fc.asyncProperty(
        folderNameArb,
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        async (folderName, recipeInputs) => {
          // Create a folder
          const folder = exportService.createFolder(folderName);
          
          // Create recipes and move them to the folder
          const createdRecipes = recipeInputs.map(input => {
            const recipe = recipeService.createRecipe(input);
            exportService.moveToFolder(recipe.id, folder.id);
            return recipe;
          });
          
          // Archive the first recipe
          recipeService.archiveRecipe(createdRecipes[0]!.id);
          
          // Export the folder
          const exported = exportService.exportFolder(folder.id);
          
          // Verify archived recipe is NOT included
          expect(exported.recipes.length).toBe(createdRecipes.length - 1);
          
          const archivedRecipeInExport = exported.recipes.find(
            r => r.id === createdRecipes[0]!.id
          );
          expect(archivedRecipeInExport).toBeUndefined();
          
          // Verify other recipes are included
          for (let i = 1; i < createdRecipes.length; i++) {
            const found = exported.recipes.find(r => r.id === createdRecipes[i]!.id);
            expect(found).toBeDefined();
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
