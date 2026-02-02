import { describe, it, expect, beforeEach } from 'vitest';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeRepository } from '../../src/repositories/recipe-repository.js';
import { PdfService } from '../../src/services/pdf-service.js';
import { RecipeInput } from '../../src/types/recipe.js';

describe('PdfService', () => {
  let db: Database;
  let repo: RecipeRepository;
  let service: PdfService;

  beforeEach(async () => {
    db = await createDatabase();
    repo = new RecipeRepository(db);
    service = new PdfService(db);
  });

  it('should generate a PDF for a recipe', async () => {
    const input: RecipeInput = {
      title: 'PDF Test Recipe',
      ingredients: [{ name: 'ingredient', quantity: 1, unit: 'cup' }],
      instructions: [{ text: 'instruction' }],
      prepTimeMinutes: 10,
      cookTimeMinutes: 20,
      servings: 4
    };

    const recipe = repo.createRecipe(input);
    const pdf = service.exportRecipeToPdf(recipe.id);

    expect(pdf).toBeInstanceOf(Uint8Array);
    const text = new TextDecoder().decode(pdf);
    expect(text).toContain('%PDF-1.4');
    expect(text).toContain('PDF Test Recipe');
    expect(text).toContain('INGREDIENTS');
    expect(text).toContain('INSTRUCTIONS');
  });
});
