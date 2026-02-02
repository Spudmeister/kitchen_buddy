/**
 * Recommendation Service - Browser-adapted version for PWA
 *
 * Provides functionality for recommending recipes based on ratings,
 * cook frequency, and various filters.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

import type { BrowserDatabase } from '@db/browser-database';
import type { Recipe } from '@/types/recipe';
import { RecipeService } from './recipe-service';

/**
 * Service for generating recipe recommendations
 */
export class RecommendationService {
  private recipeService: RecipeService;

  constructor(private db: BrowserDatabase) {
    this.recipeService = new RecipeService(db);
  }

  /**
   * Get favorite recipes - highly rated AND frequently cooked
   * Requirements: 14.1, 14.2
   *
   * Favorites are recipes with high ratings (≥4 stars) AND high cook frequency
   * (above median), sorted by a combination of both factors.
   */
  getFavorites(limit: number = 10): Recipe[] {
    // Get all recipes with ratings >= 4
    const highRatedIds = this.getRecipeIdsByMinRating(4);

    if (highRatedIds.length === 0) {
      return [];
    }

    // Get cook counts for all recipes
    const cookCounts = this.getCookCountsForRecipes(highRatedIds);

    // Calculate median cook count
    const counts = Array.from(cookCounts.values()).sort((a, b) => a - b);
    const medianCookCount = counts.length > 0
      ? counts[Math.floor(counts.length / 2)]!
      : 0;

    // Filter to recipes with cook count above median
    const favoriteIds = highRatedIds.filter(id => {
      const count = cookCounts.get(id) ?? 0;
      return count > medianCookCount;
    });

    // Get ratings for sorting
    const ratings = this.getAllRecipeRatings();

    // Sort by combined score (rating * cook_count)
    const sortedIds = favoriteIds.sort((a, b) => {
      const ratingA = ratings.get(a) ?? 0;
      const ratingB = ratings.get(b) ?? 0;
      const countA = cookCounts.get(a) ?? 0;
      const countB = cookCounts.get(b) ?? 0;
      const scoreA = ratingA * countA;
      const scoreB = ratingB * countB;
      return scoreB - scoreA; // Descending
    });

    // Get recipes
    return this.getRecipesByIds(sortedIds.slice(0, limit));
  }

  /**
   * Get deep cuts - good ratings but rarely cooked
   * Requirements: 14.3
   *
   * Deep cuts are recipes with good ratings (≥3 stars) AND low cook frequency
   * (below median or never cooked), sorted by rating.
   */
  getDeepCuts(limit: number = 10): Recipe[] {
    // Get all recipes with ratings >= 3
    const goodRatedIds = this.getRecipeIdsByMinRating(3);

    if (goodRatedIds.length === 0) {
      return [];
    }

    // Get cook counts for all rated recipes
    const cookCounts = this.getCookCountsForRecipes(goodRatedIds);

    // Calculate median cook count
    const counts = Array.from(cookCounts.values()).sort((a, b) => a - b);
    const medianCookCount = counts.length > 0
      ? counts[Math.floor(counts.length / 2)]!
      : 0;

    // Filter to recipes with cook count below or equal to median (including never cooked = 0)
    const deepCutIds = goodRatedIds.filter(id => {
      const count = cookCounts.get(id) ?? 0;
      return count <= medianCookCount;
    });

    // Get ratings for sorting
    const ratings = this.getAllRecipeRatings();

    // Sort by rating descending
    const sortedIds = deepCutIds.sort((a, b) => {
      const ratingA = ratings.get(a) ?? 0;
      const ratingB = ratings.get(b) ?? 0;
      return ratingB - ratingA;
    });

    // Get recipes
    return this.getRecipesByIds(sortedIds.slice(0, limit));
  }

  /**
   * Get recently added recipes
   * Requirements: 14.4
   */
  getRecentlyAdded(limit: number = 10): Recipe[] {
    const rows = this.db.exec(
      `SELECT id FROM recipes
       WHERE archived_at IS NULL
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    const ids = rows.map(row => row[0] as string);
    return this.getRecipesByIds(ids);
  }

  /**
   * Get recipes not cooked recently ("Haven't Made Lately")
   * Requirements: 14.5
   */
  getNotCookedRecently(limit: number = 10, daysSinceLastCook: number = 30): Recipe[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastCook);
    const cutoffStr = cutoffDate.toISOString();

    // Get recipes that either:
    // 1. Have never been cooked, OR
    // 2. Were last cooked before the cutoff date
    const rows = this.db.exec(
      `SELECT r.id FROM recipes r
       LEFT JOIN (
         SELECT recipe_id, MAX(date) as last_cooked
         FROM cook_sessions
         GROUP BY recipe_id
       ) cs ON r.id = cs.recipe_id
       WHERE r.archived_at IS NULL
       AND (cs.last_cooked IS NULL OR cs.last_cooked < ?)
       ORDER BY cs.last_cooked ASC NULLS FIRST
       LIMIT ?`,
      [cutoffStr, limit]
    );

    const ids = rows.map(row => row[0] as string);
    return this.getRecipesByIds(ids);
  }

  // Private helper methods

  /**
   * Get recipe IDs with minimum rating
   */
  private getRecipeIdsByMinRating(minRating: number): string[] {
    const rows = this.db.exec(
      `SELECT DISTINCT r.recipe_id
       FROM ratings r
       JOIN recipes rec ON r.recipe_id = rec.id
       WHERE r.rating >= ? AND rec.archived_at IS NULL`,
      [minRating]
    );
    return rows.map(row => row[0] as string);
  }

  /**
   * Get all recipe ratings (most recent rating per recipe)
   */
  private getAllRecipeRatings(): Map<string, number> {
    const ratings = new Map<string, number>();
    const rows = this.db.exec(
      `SELECT recipe_id, rating
       FROM ratings r1
       WHERE rated_at = (
         SELECT MAX(rated_at) FROM ratings r2 WHERE r2.recipe_id = r1.recipe_id
       )`
    );
    for (const row of rows) {
      ratings.set(row[0] as string, row[1] as number);
    }
    return ratings;
  }

  /**
   * Get cook counts for a list of recipe IDs
   */
  private getCookCountsForRecipes(recipeIds: string[]): Map<string, number> {
    const counts = new Map<string, number>();

    if (recipeIds.length === 0) {
      return counts;
    }

    // SQLite has a limit on the number of variables in a query
    // Batch the queries to avoid "too many SQL variables" error
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < recipeIds.length; i += BATCH_SIZE) {
      const batch = recipeIds.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(', ');
      const rows = this.db.exec(
        `SELECT recipe_id, COUNT(*) as count
         FROM cook_sessions
         WHERE recipe_id IN (${placeholders})
         GROUP BY recipe_id`,
        batch
      );

      for (const row of rows) {
        counts.set(row[0] as string, row[1] as number);
      }
    }

    // Set 0 for recipes with no cook sessions
    for (const id of recipeIds) {
      if (!counts.has(id)) {
        counts.set(id, 0);
      }
    }

    return counts;
  }

  /**
   * Get recipes by IDs, preserving order
   */
  private getRecipesByIds(ids: string[]): Recipe[] {
    const recipes: Recipe[] = [];
    for (const id of ids) {
      const recipe = this.recipeService.getRecipe(id);
      if (recipe && !recipe.archivedAt) {
        recipes.push(recipe);
      }
    }
    return recipes;
  }
}
