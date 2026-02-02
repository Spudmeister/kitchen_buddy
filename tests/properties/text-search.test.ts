/**
 * Property Test: Text Search Coverage
 *
 * **Feature: sous-chef, Property 9: Text Search Coverage**
 * **Validates: Requirements 3.5**
 *
 * For any recipe and any substring that appears in its title, ingredients,
 * instructions, or tags, searching for that substring SHALL return that
 * recipe in the results.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { SearchService } from '../../src/services/search-service.js';
import { TagService } from '../../src/services/tag-service.js';
import { minimalRecipeInputArb } from '../generators/recipe-generators.js';

describe('Property 9: Text Search Coverage', () => {
  let db: Database;
  let recipeService: RecipeService;
  let searchService: SearchService;
  let tagService: TagService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    searchService = new SearchService(db);
    tagService = new TagService(db);
  });

  afterEach(() => {
    db.close();
  });

  /**
   * Extract a random substring from a string
   */
  function getRandomSubstring(str: string, minLen: number = 3): string | null {
    if (str.length < minLen) {
      return str.length > 0 ? str : null;
    }
    
    // Get a word from the string (more likely to match)
    const words = str.split(/\s+/).filter((w) => w.length >= minLen);
    if (words.length > 0) {
      return words[Math.floor(Math.random() * words.length)]!;
    }
    
    // Fall back to substring
    const maxStart = str.length - minLen;
    const start = Math.floor(Math.random() * (maxStart + 1));
    const len = Math.min(minLen + Math.floor(Math.random() * 5), str.length - start);
    return str.substring(start, start + len);
  }

  it('should find recipe when searching by title substring', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe
        const recipe = recipeService.createRecipe(recipeInput);

        // Get a searchable word from the title
        const words = recipe.title.split(/\s+/).filter((w) => w.length >= 2);
        if (words.length === 0) {
          return true; // Skip if no searchable words
        }

        const searchTerm = words[0]!;

        // Search for the term
        const results = searchService.searchRecipes(searchTerm);
        const resultIds = results.map((r) => r.id);

        // Recipe should be in results
        expect(resultIds).toContain(recipe.id);
      }),
      { numRuns: 100 }
    );
  });

  it('should find recipe when searching by ingredient name', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe
        const recipe = recipeService.createRecipe(recipeInput);

        // Get a searchable word from an ingredient name
        const ingredientNames = recipe.ingredients.map((i) => i.name);
        const allWords = ingredientNames
          .flatMap((name) => name.split(/\s+/))
          .filter((w) => w.length >= 2);

        if (allWords.length === 0) {
          return true; // Skip if no searchable words
        }

        const searchTerm = allWords[0]!;

        // Search for the term
        const results = searchService.searchRecipes(searchTerm);
        const resultIds = results.map((r) => r.id);

        // Recipe should be in results
        expect(resultIds).toContain(recipe.id);
      }),
      { numRuns: 100 }
    );
  });

  it('should find recipe when searching by instruction text', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe
        const recipe = recipeService.createRecipe(recipeInput);

        // Get a searchable word from an instruction
        const instructionTexts = recipe.instructions.map((i) => i.text);
        const allWords = instructionTexts
          .flatMap((text) => text.split(/\s+/))
          .filter((w) => w.length >= 3);

        if (allWords.length === 0) {
          return true; // Skip if no searchable words
        }

        const searchTerm = allWords[0]!;

        // Search for the term
        const results = searchService.searchRecipes(searchTerm);
        const resultIds = results.map((r) => r.id);

        // Recipe should be in results
        expect(resultIds).toContain(recipe.id);
      }),
      { numRuns: 100 }
    );
  });

  it('should find recipe when searching by tag', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.string({ minLength: 3, maxLength: 20 }).filter((s) => /^[a-z]+$/.test(s)),
        (recipeInput, tag) => {
          // Create recipe without tags
          const recipe = recipeService.createRecipe({ ...recipeInput, tags: undefined });

          // Add a tag
          tagService.addTag(recipe.id, tag);

          // Search for the tag
          const results = searchService.searchRecipes(tag);
          const resultIds = results.map((r) => r.id);

          // Recipe should be in results
          expect(resultIds).toContain(recipe.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not find archived recipes', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe
        const recipe = recipeService.createRecipe(recipeInput);

        // Get a searchable word from the title
        const words = recipe.title.split(/\s+/).filter((w) => w.length >= 2);
        if (words.length === 0) {
          return true; // Skip if no searchable words
        }

        const searchTerm = words[0]!;

        // Archive the recipe
        recipeService.archiveRecipe(recipe.id);

        // Search for the term
        const results = searchService.searchRecipes(searchTerm);
        const resultIds = results.map((r) => r.id);

        // Recipe should NOT be in results
        expect(resultIds).not.toContain(recipe.id);
      }),
      { numRuns: 50 }
    );
  });

  it('should return empty results for empty query', () => {
    fc.assert(
      fc.property(minimalRecipeInputArb, (recipeInput) => {
        // Create recipe
        recipeService.createRecipe(recipeInput);

        // Search with empty query
        const results = searchService.searchRecipes('');

        // Should return empty results
        expect(results).toHaveLength(0);
      }),
      { numRuns: 20 }
    );
  });
});
