import { describe, it, expect } from 'vitest';
import { extractSchemaOrg, parseFromHtml, normalizeIngredient } from '../../src/services/recipe-parser.js';

describe('RecipeParser', () => {
  describe('extractSchemaOrg', () => {
    it('should extract recipe from JSON-LD', () => {
      const html = `
        <html>
          <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Test Cake",
              "recipeIngredient": ["1 cup flour", "2 eggs"],
              "recipeInstructions": "Mix and bake"
            }
          </script>
        </html>
      `;
      const result = extractSchemaOrg(html);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Cake');
      expect(result?.recipeIngredient).toHaveLength(2);
    });

    it('should extract recipe from Microdata', () => {
      const html = `
        <div itemscope itemtype="https://schema.org/Recipe">
          <h1 itemprop="name">Microdata Cake</h1>
          <span itemprop="recipeIngredient">2 cups flour</span>
          <span itemprop="recipeIngredient">1 cup sugar</span>
          <div itemprop="recipeInstructions">Bake it.</div>
        </div>
      `;
      const result = extractSchemaOrg(html);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Microdata Cake');
      expect(result?.recipeIngredient).toHaveLength(2);
    });
  });

  describe('parseFromHtml', () => {
    it('should parse recipe from HTML content', () => {
      const html = `
        <script type="application/ld+json">
          {
            "@type": "Recipe",
            "name": "LdJson Pie",
            "recipeIngredient": ["Apples", "Crust"],
            "recipeInstructions": ["Slice apples", "Bake pie"],
            "prepTime": "PT15M",
            "cookTime": "PT45M",
            "recipeYield": "8 servings"
          }
        </script>
      `;
      const result = parseFromHtml(html);
      expect(result.success).toBe(true);
      expect(result.recipe?.title).toBe('LdJson Pie');
      expect(result.recipe?.prepTime?.minutes).toBe(15);
      expect(result.recipe?.cookTime?.minutes).toBe(45);
      expect(result.recipe?.servings).toBe(8);
    });
  });

  describe('normalizeIngredient', () => {
    it('should parse simple ingredients', () => {
      const result = normalizeIngredient('2 cups all-purpose flour');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cup');
      expect(result.name).toBe('all-purpose flour');
    });

    it('should parse ingredients with unicode fractions', () => {
      const result = normalizeIngredient('½ tsp salt');
      expect(result.quantity).toBe(0.5);
      expect(result.unit).toBe('tsp');
      expect(result.name).toBe('salt');
    });

    it('should parse ingredients with notes', () => {
      const result = normalizeIngredient('1 lb chicken breast, thinly sliced');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('lb');
      expect(result.name).toBe('chicken breast');
      expect(result.notes).toBe('thinly sliced');
    });
  });
});
