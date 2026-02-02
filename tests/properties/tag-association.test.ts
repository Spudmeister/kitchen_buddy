/**
 * Property Test: Tag Association Completeness
 *
 * **Feature: sous-chef, Property 8: Tag Association Completeness**
 * **Validates: Requirements 3.1, 3.4**
 *
 * For any recipe and any tag added to it, searching by that tag
 * SHALL return that recipe in the results.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createDatabase, Database } from '../../src/db/database.js';
import { RecipeService } from '../../src/services/recipe-service.js';
import { TagService } from '../../src/services/tag-service.js';
import { minimalRecipeInputArb, tagArb } from '../generators/recipe-generators.js';

describe('Property 8: Tag Association Completeness', () => {
  let db: Database;
  let recipeService: RecipeService;
  let tagService: TagService;

  beforeEach(async () => {
    db = await createDatabase();
    recipeService = new RecipeService(db);
    tagService = new TagService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should return recipe when searching by any tag added to it', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        fc.array(tagArb, { minLength: 1, maxLength: 5 }),
        (recipeInput, tags) => {
          // Create recipe without tags initially
          const inputWithoutTags = { ...recipeInput, tags: undefined };
          const recipe = recipeService.createRecipe(inputWithoutTags);

          // Add each tag to the recipe
          const uniqueTags = [...new Set(tags)];
          for (const tag of uniqueTags) {
            tagService.addTag(recipe.id, tag);
          }

          // Verify each tag returns the recipe in search results
          for (const tag of uniqueTags) {
            const results = tagService.getRecipesByTag(tag);
            const recipeIds = results.map((r) => r.id);
            expect(recipeIds).toContain(recipe.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not return recipe after tag is removed', () => {
    fc.assert(
      fc.property(
        minimalRecipeInputArb,
        tagArb,
        (recipeInput, tag) => {
          // Create recipe
          const recipe = recipeService.createRecipe({ ...recipeInput, tags: undefined });

          // Add tag
          tagService.addTag(recipe.id, tag);

          // Verify tag is associated
          expect(tagService.hasTag(recipe.id, tag)).toBe(true);

          // Remove tag
          tagService.removeTag(recipe.id, tag);

          // Verify tag is no longer associated
          expect(tagService.hasTag(recipe.id, tag)).toBe(false);

          // Verify recipe is not returned when searching by removed tag
          const results = tagService.getRecipesByTag(tag);
          const recipeIds = results.map((r) => r.id);
          expect(recipeIds).not.toContain(recipe.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all recipes with a given tag', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 2, maxLength: 5 }),
        fc.uuid(),
        (recipeInputs, uniqueTagSuffix) => {
          // Use a unique tag per iteration to avoid cross-iteration interference
          const sharedTag = `test-tag-${uniqueTagSuffix}`;
          
          // Create multiple recipes
          const recipes = recipeInputs.map((input) =>
            recipeService.createRecipe({ ...input, tags: undefined })
          );

          // Add the same tag to all recipes
          for (const recipe of recipes) {
            tagService.addTag(recipe.id, sharedTag);
          }

          // Search by tag
          const results = tagService.getRecipesByTag(sharedTag);
          const resultIds = results.map((r) => r.id);

          // Verify all recipes are returned
          for (const recipe of recipes) {
            expect(resultIds).toContain(recipe.id);
          }

          // Verify count matches
          expect(results.length).toBe(recipes.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should track tag counts correctly', () => {
    fc.assert(
      fc.property(
        fc.array(minimalRecipeInputArb, { minLength: 1, maxLength: 5 }),
        fc.uuid(),
        (recipeInputs, uniqueTagSuffix) => {
          // Use a unique tag per iteration to avoid cross-iteration interference
          const tag = `count-tag-${uniqueTagSuffix}`;
          
          // Create recipes and add the same tag to all
          const recipes = recipeInputs.map((input) =>
            recipeService.createRecipe({ ...input, tags: undefined })
          );

          for (const recipe of recipes) {
            tagService.addTag(recipe.id, tag);
          }

          // Get all tags with counts
          const allTags = tagService.getAllTags();
          const tagInfo = allTags.find((t) => t.name === tag.toLowerCase());

          // Verify count matches number of recipes
          expect(tagInfo).toBeDefined();
          expect(tagInfo!.count).toBe(recipes.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
