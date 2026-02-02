import { describe, it, expect, beforeEach } from 'vitest';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeRepository } from '../../src/repositories/recipe-repository.js';
import { ExportService } from '../../src/services/export-service.js';
import { RecipeInput } from '../../src/types/recipe.js';

describe('ExportService', () => {
  let db: Database;
  let repo: RecipeRepository;
  let service: ExportService;

  beforeEach(async () => {
    db = await createDatabase();
    repo = new RecipeRepository(db);
    service = new ExportService(db);
  });

  it('should export a recipe and import it back', async () => {
    const input: RecipeInput = {
      title: 'Export Test',
      ingredients: [{ name: 'ing1', quantity: 1, unit: 'cup' }],
      instructions: [{ text: 'step1' }],
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      servings: 4,
      tags: ['test']
    };

    const recipe = repo.createRecipe(input);
    const exported = service.exportRecipe(recipe.id);

    expect(exported.recipes).toHaveLength(1);
    expect(exported.recipes[0].title).toBe('Export Test');

    const importResult = service.importRecipes(exported);
    expect(importResult.recipesImported).toBe(1);

    const importedRecipeId = importResult.importedRecipeIds[0];
    const imported = repo.getRecipe(importedRecipeId);
    expect(imported?.title).toBe('Export Test');
    expect(imported?.ingredients).toHaveLength(1);
    expect(imported?.tags).toContain('test');
  });

  it('should export a folder of recipes', async () => {
    const folder = service.createFolder('My Folder');

    const input: RecipeInput = {
      title: 'Recipe in Folder',
      ingredients: [],
      instructions: [],
      prepTimeMinutes: 0,
      cookTimeMinutes: 0,
      servings: 1,
      folderId: folder.id
    };

    repo.createRecipe(input);

    const exported = service.exportFolder(folder.id);
    expect(exported.folder?.name).toBe('My Folder');
    expect(exported.recipes).toHaveLength(1);
    expect(exported.recipes[0].title).toBe('Recipe in Folder');
  });
});
