/**
 * Tag Service - Business logic for recipe tagging
 *
 * Provides tag management operations for recipes.
 * Requirements: 3.1, 3.4, 3.7
 */

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type { Recipe, Ingredient } from '../types/recipe.js';

/**
 * Tag count information (for tag service)
 */
export interface TagServiceCount {
  /** Tag name */
  name: string;
  /** Number of recipes with this tag */
  count: number;
}

/**
 * Dietary tag types
 * Requirements: 3.7 - Built-in dietary categories
 */
export type DietaryTag =
  | 'vegan'
  | 'vegetarian'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'low-carb';

/**
 * All dietary tags
 */
export const DIETARY_TAGS: DietaryTag[] = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'low-carb',
];

/**
 * Ingredients that indicate non-vegan recipes
 */
const NON_VEGAN_INGREDIENTS = [
  'meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'bacon', 'ham', 'sausage',
  'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'seafood', 'anchovy', 'anchovies',
  'egg', 'eggs',
  'milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'whey', 'casein',
  'honey', 'gelatin', 'lard',
];

/**
 * Ingredients that indicate non-vegetarian recipes (meat/fish only)
 */
const NON_VEGETARIAN_INGREDIENTS = [
  'meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'bacon', 'ham', 'sausage',
  'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'seafood', 'anchovy', 'anchovies',
  'gelatin', 'lard',
];

/**
 * Ingredients that contain gluten
 */
const GLUTEN_INGREDIENTS = [
  'wheat', 'flour', 'bread', 'pasta', 'noodle', 'noodles', 'spaghetti', 'macaroni',
  'barley', 'rye', 'oat', 'oats', 'couscous', 'bulgur', 'semolina', 'farina',
  'cracker', 'crackers', 'breadcrumb', 'breadcrumbs', 'panko',
  'beer', 'malt', 'seitan',
];

/**
 * Ingredients that contain dairy
 */
const DAIRY_INGREDIENTS = [
  'milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'whey', 'casein',
  'ghee', 'sour cream', 'cottage cheese', 'ricotta', 'mozzarella', 'parmesan',
  'cheddar', 'brie', 'feta', 'gouda', 'swiss', 'provolone', 'mascarpone',
  'half-and-half', 'half and half', 'buttermilk', 'ice cream',
];

/**
 * Ingredients that contain nuts
 */
const NUT_INGREDIENTS = [
  'almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans', 'cashew', 'cashews',
  'pistachio', 'pistachios', 'hazelnut', 'hazelnuts', 'macadamia', 'brazil nut',
  'pine nut', 'pine nuts', 'chestnut', 'chestnuts', 'peanut', 'peanuts',
  'nut butter', 'almond butter', 'peanut butter', 'nutella',
];

/**
 * High-carb ingredients
 */
const HIGH_CARB_INGREDIENTS = [
  'sugar', 'flour', 'bread', 'pasta', 'rice', 'potato', 'potatoes', 'corn',
  'honey', 'maple syrup', 'molasses', 'agave',
  'cereal', 'oat', 'oats', 'oatmeal', 'granola',
  'banana', 'grape', 'grapes', 'mango', 'pineapple',
  'candy', 'chocolate', 'cake', 'cookie', 'cookies', 'pie', 'pastry',
];

/**
 * Service for managing recipe tags
 */
export class TagService {
  constructor(private db: Database) {}

  /**
   * Add a tag to a recipe
   * Requirements: 3.1 - Associate tags with recipes
   */
  addTag(recipeId: string, tagName: string): void {
    // Normalize tag name (lowercase, trim whitespace)
    const normalizedTag = tagName.trim().toLowerCase();
    
    if (normalizedTag.length === 0) {
      throw new Error('Tag name cannot be empty');
    }

    // Verify recipe exists
    const recipeExists = this.db.get<[number]>(
      'SELECT 1 FROM recipes WHERE id = ?',
      [recipeId]
    );
    
    if (!recipeExists) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    this.db.transaction(() => {
      // Get or create tag
      let tagId: string;
      const existingTag = this.db.get<[string]>(
        'SELECT id FROM tags WHERE name = ?',
        [normalizedTag]
      );

      if (existingTag) {
        tagId = existingTag[0];
      } else {
        tagId = uuidv4();
        this.db.run('INSERT INTO tags (id, name) VALUES (?, ?)', [tagId, normalizedTag]);
      }

      // Associate tag with recipe (ignore if already exists)
      this.db.run(
        'INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)',
        [recipeId, tagId]
      );
    });
  }

  /**
   * Remove a tag from a recipe
   * Requirements: 3.1 - Manage tag associations
   */
  removeTag(recipeId: string, tagName: string): void {
    const normalizedTag = tagName.trim().toLowerCase();

    // Get tag ID
    const tagRow = this.db.get<[string]>(
      'SELECT id FROM tags WHERE name = ?',
      [normalizedTag]
    );

    if (!tagRow) {
      // Tag doesn't exist, nothing to remove
      return;
    }

    const tagId = tagRow[0];

    // Remove association
    this.db.run(
      'DELETE FROM recipe_tags WHERE recipe_id = ? AND tag_id = ?',
      [recipeId, tagId]
    );

    // Optionally clean up orphaned tags (tags with no recipes)
    this.cleanupOrphanedTags();
  }

  /**
   * Get all recipes with a specific tag
   * Requirements: 3.4 - Return all recipes matching specified tags
   */
  getRecipesByTag(tagName: string): Recipe[] {
    const normalizedTag = tagName.trim().toLowerCase();

    // Get recipe IDs with this tag
    const recipeRows = this.db.exec(
      `SELECT r.id FROM recipes r
       JOIN recipe_tags rt ON r.id = rt.recipe_id
       JOIN tags t ON rt.tag_id = t.id
       WHERE t.name = ? AND r.archived_at IS NULL`,
      [normalizedTag]
    );

    // Load full recipe data for each
    return recipeRows
      .map((row) => this.loadRecipe(row[0] as string))
      .filter((r): r is Recipe => r !== undefined);
  }

  /**
   * Get all tags with their recipe counts
   * Requirements: 3.4 - Support tag-based search
   */
  getAllTags(): TagServiceCount[] {
    const rows = this.db.exec(
      `SELECT t.name, COUNT(rt.recipe_id) as count
       FROM tags t
       LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
       LEFT JOIN recipes r ON rt.recipe_id = r.id AND r.archived_at IS NULL
       GROUP BY t.id, t.name
       HAVING count > 0
       ORDER BY count DESC, t.name ASC`
    );

    return rows.map((row) => ({
      name: row[0] as string,
      count: row[1] as number,
    }));
  }

  /**
   * Get tags for a specific recipe
   */
  getTagsForRecipe(recipeId: string): string[] {
    const rows = this.db.exec(
      `SELECT t.name FROM tags t
       JOIN recipe_tags rt ON t.id = rt.tag_id
       WHERE rt.recipe_id = ?
       ORDER BY t.name`,
      [recipeId]
    );

    return rows.map((row) => row[0] as string);
  }

  /**
   * Check if a recipe has a specific tag
   */
  hasTag(recipeId: string, tagName: string): boolean {
    const normalizedTag = tagName.trim().toLowerCase();

    const row = this.db.get<[number]>(
      `SELECT 1 FROM recipe_tags rt
       JOIN tags t ON rt.tag_id = t.id
       WHERE rt.recipe_id = ? AND t.name = ?`,
      [recipeId, normalizedTag]
    );

    return row !== undefined;
  }

  /**
   * Remove orphaned tags (tags with no recipe associations)
   */
  private cleanupOrphanedTags(): void {
    this.db.run(
      `DELETE FROM tags WHERE id NOT IN (
        SELECT DISTINCT tag_id FROM recipe_tags
      )`
    );
  }

  /**
   * Load a recipe by ID (helper method)
   */
  private loadRecipe(id: string): Recipe | undefined {
    // Get recipe metadata
    const recipeRow = this.db.get<
      [string, number, string | null, string | null, string | null, string]
    >(
      'SELECT id, current_version, folder_id, parent_recipe_id, archived_at, created_at FROM recipes WHERE id = ?',
      [id]
    );

    if (!recipeRow) {
      return undefined;
    }

    const [recipeId, currentVersion, folderId, parentRecipeId, archivedAt, createdAt] = recipeRow;

    // Get version data
    const versionRow = this.db.get<
      [string, string, string | null, number | null, number | null, number, string | null, string]
    >(
      `SELECT id, title, description, prep_time_minutes, cook_time_minutes, servings, source_url, created_at
       FROM recipe_versions WHERE recipe_id = ? AND version = ?`,
      [recipeId, currentVersion]
    );

    if (!versionRow) {
      return undefined;
    }

    const [
      versionId,
      title,
      description,
      prepTimeMinutes,
      cookTimeMinutes,
      servings,
      sourceUrl,
      versionCreatedAt,
    ] = versionRow;

    // Get ingredients
    const ingredientRows = this.db.exec(
      `SELECT id, name, quantity, unit, notes, category
       FROM ingredients WHERE recipe_version_id = ? ORDER BY sort_order`,
      [versionId]
    );

    const ingredients = ingredientRows.map((row) => ({
      id: row[0] as string,
      name: row[1] as string,
      quantity: row[2] as number,
      unit: row[3] as Recipe['ingredients'][0]['unit'],
      notes: (row[4] as string | null) ?? undefined,
      category: (row[5] as Recipe['ingredients'][0]['category'] | null) ?? undefined,
    }));

    // Get instructions
    const instructionRows = this.db.exec(
      `SELECT id, step_number, text, duration_minutes, notes
       FROM instructions WHERE recipe_version_id = ? ORDER BY step_number`,
      [versionId]
    );

    const instructions = instructionRows.map((row) => ({
      id: row[0] as string,
      step: row[1] as number,
      text: row[2] as string,
      duration: row[3] != null ? { minutes: row[3] as number } : undefined,
      notes: (row[4] as string | null) ?? undefined,
    }));

    // Get tags
    const tags = this.getTagsForRecipe(recipeId);

    // Get rating (latest)
    const ratingRow = this.db.get<[number]>(
      'SELECT rating FROM ratings WHERE recipe_id = ? ORDER BY rated_at DESC LIMIT 1',
      [recipeId]
    );

    return {
      id: recipeId,
      currentVersion,
      title,
      description: description ?? undefined,
      ingredients,
      instructions,
      prepTime: { minutes: prepTimeMinutes ?? 0 },
      cookTime: { minutes: cookTimeMinutes ?? 0 },
      servings,
      tags,
      rating: ratingRow?.[0],
      sourceUrl: sourceUrl ?? undefined,
      folderId: folderId ?? undefined,
      parentRecipeId: parentRecipeId ?? undefined,
      createdAt: new Date(createdAt),
      updatedAt: new Date(versionCreatedAt),
      archivedAt: archivedAt ? new Date(archivedAt) : undefined,
    };
  }

  /**
   * Detect dietary tags based on ingredient analysis
   * Requirements: 3.7 - Built-in dietary categories
   *
   * Analyzes ingredients to determine which dietary tags apply.
   * Returns tags that the recipe qualifies for (e.g., vegan, gluten-free).
   */
  detectDietaryTags(ingredients: Ingredient[]): DietaryTag[] {
    const detectedTags: DietaryTag[] = [];
    const ingredientNames = ingredients.map((i) => i.name.toLowerCase());

    // Check for vegan (no animal products)
    if (!this.containsAny(ingredientNames, NON_VEGAN_INGREDIENTS)) {
      detectedTags.push('vegan');
    }

    // Check for vegetarian (no meat/fish, but allows dairy/eggs)
    if (!this.containsAny(ingredientNames, NON_VEGETARIAN_INGREDIENTS)) {
      detectedTags.push('vegetarian');
    }

    // Check for gluten-free
    if (!this.containsAny(ingredientNames, GLUTEN_INGREDIENTS)) {
      detectedTags.push('gluten-free');
    }

    // Check for dairy-free
    if (!this.containsAny(ingredientNames, DAIRY_INGREDIENTS)) {
      detectedTags.push('dairy-free');
    }

    // Check for nut-free
    if (!this.containsAny(ingredientNames, NUT_INGREDIENTS)) {
      detectedTags.push('nut-free');
    }

    // Check for low-carb (no high-carb ingredients)
    if (!this.containsAny(ingredientNames, HIGH_CARB_INGREDIENTS)) {
      detectedTags.push('low-carb');
    }

    return detectedTags;
  }

  /**
   * Check if any ingredient name contains any of the keywords
   */
  private containsAny(ingredientNames: string[], keywords: string[]): boolean {
    for (const name of ingredientNames) {
      for (const keyword of keywords) {
        if (name.includes(keyword)) {
          return true;
        }
      }
    }
    return false;
  }
}


/**
 * Tag suggestion from AI (for tag service)
 * Requirements: 3.2, 3.3 - AI-powered tag suggestions with confidence
 */
export interface TagServiceSuggestion {
  /** Suggested tag name */
  tag: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for the suggestion */
  reason: string;
}

/**
 * AI Service interface for tag suggestions
 */
export interface AITagService {
  isEnabled(): boolean;
  suggestTags(recipe: Recipe): Promise<TagServiceSuggestion[]>;
}

/**
 * Extended Tag Service with AI support
 * Requirements: 3.2, 3.3 - AI-powered tag suggestions
 */
export class AITagService extends TagService {
  private aiService?: AITagService;

  constructor(db: Database, aiService?: AITagService) {
    super(db);
    this.aiService = aiService;
  }

  /**
   * Set the AI service for tag suggestions
   */
  setAIService(aiService: AITagService): void {
    this.aiService = aiService;
  }

  /**
   * Suggest tags for a recipe using AI
   * Requirements: 3.2 - Auto-generate dietary tags based on ingredient analysis
   * Requirements: 3.3 - Present auto-tags for user confirmation
   * 
   * @param recipe - Recipe to suggest tags for
   * @returns Array of tag suggestions with confidence scores
   */
  async suggestTags(recipe: Recipe): Promise<TagServiceSuggestion[]> {
    if (!this.aiService?.isEnabled()) {
      // Fall back to dietary tag detection when AI is not available
      const dietaryTags = this.detectDietaryTags(recipe.ingredients);
      return dietaryTags.map((tag) => ({
        tag,
        confidence: 0.9, // High confidence for rule-based detection
        reason: 'Detected based on ingredient analysis',
      }));
    }

    try {
      return await this.aiService.suggestTags(recipe);
    } catch {
      // Fall back to dietary tag detection on AI error
      const dietaryTags = this.detectDietaryTags(recipe.ingredients);
      return dietaryTags.map((tag) => ({
        tag,
        confidence: 0.9,
        reason: 'Detected based on ingredient analysis (AI unavailable)',
      }));
    }
  }

  /**
   * Apply suggested tags to a recipe after user confirmation
   * Requirements: 3.3 - Present auto-tags for user confirmation before applying
   * 
   * @param recipeId - Recipe ID to apply tags to
   * @param suggestions - Tag suggestions to apply
   * @param minConfidence - Minimum confidence threshold (default: 0.7)
   */
  applySuggestedTags(
    recipeId: string,
    suggestions: TagServiceSuggestion[],
    minConfidence: number = 0.7
  ): void {
    for (const suggestion of suggestions) {
      if (suggestion.confidence >= minConfidence) {
        this.addTag(recipeId, suggestion.tag);
      }
    }
  }
}
