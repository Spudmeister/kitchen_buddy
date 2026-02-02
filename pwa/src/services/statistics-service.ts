/**
 * Statistics Service - Browser-adapted version for PWA
 * 
 * Provides cook session logging and statistics tracking.
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 28.1, 28.2, 28.3, 28.4, 29.1, 29.2, 29.3
 */

import { v4 as uuidv4 } from 'uuid';
import type { BrowserDatabase } from '@db/browser-database';
import type {
  CookSession,
  CookSessionInput,
  CookStats,
  RatingEntry,
  PersonalStats,
  YearInReview,
  RecipeCount,
  TagCount,
  MonthlyStats,
  StatisticsDateRange,
} from '@types/statistics';

/**
 * Service for managing cook session statistics
 */
export class StatisticsService {
  constructor(private db: BrowserDatabase) {}

  /**
   * Log a cook session for a recipe
   * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5
   */
  logCookSession(input: CookSessionInput): CookSession {
    const id = uuidv4();
    const dateStr = input.date.toISOString();

    this.db.run(
      `INSERT INTO cook_sessions (id, recipe_id, instance_id, date, actual_prep_minutes, actual_cook_minutes, servings_made, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.recipeId,
        input.instanceId ?? null,
        dateStr,
        input.actualPrepMinutes ?? null,
        input.actualCookMinutes ?? null,
        input.servingsMade,
        input.notes ?? null,
      ]
    );

    return this.getCookSession(id)!;
  }

  /**
   * Get a cook session by ID
   */
  getCookSession(id: string): CookSession | undefined {
    const row = this.db.get<[string, string, string | null, string, number | null, number | null, number, string | null]>(
      `SELECT id, recipe_id, instance_id, date, actual_prep_minutes, actual_cook_minutes, servings_made, notes
       FROM cook_sessions WHERE id = ?`,
      [id]
    );

    if (!row) {
      return undefined;
    }

    const [sessionId, recipeId, instanceId, dateStr, prepMinutes, cookMinutes, servingsMade, notes] = row;

    return {
      id: sessionId,
      recipeId,
      date: new Date(dateStr),
      actualPrepTime: prepMinutes != null ? { minutes: prepMinutes } : undefined,
      actualCookTime: cookMinutes != null ? { minutes: cookMinutes } : undefined,
      servingsMade,
      notes: notes ?? undefined,
      instanceId: instanceId ?? undefined,
    };
  }

  /**
   * Get all cook sessions for a recipe
   */
  getCookSessionsForRecipe(recipeId: string): CookSession[] {
    const rows = this.db.exec(
      `SELECT id, recipe_id, instance_id, date, actual_prep_minutes, actual_cook_minutes, servings_made, notes
       FROM cook_sessions WHERE recipe_id = ? ORDER BY date DESC`,
      [recipeId]
    );

    return rows.map((row) => ({
      id: row[0] as string,
      recipeId: row[1] as string,
      date: new Date(row[3] as string),
      actualPrepTime: row[4] != null ? { minutes: row[4] as number } : undefined,
      actualCookTime: row[5] != null ? { minutes: row[5] as number } : undefined,
      servingsMade: row[6] as number,
      notes: (row[7] as string | null) ?? undefined,
      instanceId: (row[2] as string | null) ?? undefined,
    }));
  }

  /**
   * Get cook statistics for a recipe
   * Requirements: 23.6 - Update recipe statistics on log
   */
  getCookStats(recipeId: string): CookStats {
    // Get count and last cooked date
    const countRow = this.db.get<[number, string | null]>(
      `SELECT COUNT(*), MAX(date) FROM cook_sessions WHERE recipe_id = ?`,
      [recipeId]
    );

    const timesCooked = countRow?.[0] ?? 0;
    const lastCookedStr = countRow?.[1];

    if (timesCooked === 0) {
      return { timesCooked: 0 };
    }

    // Get prep time statistics
    const prepStatsRow = this.db.get<[number, number, number]>(
      `SELECT AVG(actual_prep_minutes), MIN(actual_prep_minutes), MAX(actual_prep_minutes)
       FROM cook_sessions WHERE recipe_id = ? AND actual_prep_minutes IS NOT NULL`,
      [recipeId]
    );

    // Get cook time statistics
    const cookStatsRow = this.db.get<[number, number, number]>(
      `SELECT AVG(actual_cook_minutes), MIN(actual_cook_minutes), MAX(actual_cook_minutes)
       FROM cook_sessions WHERE recipe_id = ? AND actual_cook_minutes IS NOT NULL`,
      [recipeId]
    );

    const stats: CookStats = {
      timesCooked,
      lastCooked: lastCookedStr ? new Date(lastCookedStr) : undefined,
    };

    // Add prep time stats if available
    if (prepStatsRow && prepStatsRow[0] != null) {
      stats.avgPrepTime = { minutes: Math.round(prepStatsRow[0]) };
      stats.minPrepTime = { minutes: prepStatsRow[1] };
      stats.maxPrepTime = { minutes: prepStatsRow[2] };
    }

    // Add cook time stats if available
    if (cookStatsRow && cookStatsRow[0] != null) {
      stats.avgCookTime = { minutes: Math.round(cookStatsRow[0]) };
      stats.minCookTime = { minutes: cookStatsRow[1] };
      stats.maxCookTime = { minutes: cookStatsRow[2] };
    }

    return stats;
  }

  /**
   * Rate a recipe
   */
  rateRecipe(recipeId: string, rating: number): RatingEntry {
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO ratings (id, recipe_id, rating, rated_at)
       VALUES (?, ?, ?, ?)`,
      [id, recipeId, rating, now]
    );

    return {
      id,
      recipeId,
      rating,
      ratedAt: new Date(now),
    };
  }

  /**
   * Get the current (latest) rating for a recipe
   */
  getCurrentRating(recipeId: string): number | undefined {
    const row = this.db.get<[number]>(
      `SELECT rating FROM ratings WHERE recipe_id = ? ORDER BY rated_at DESC, rowid DESC LIMIT 1`,
      [recipeId]
    );

    return row?.[0];
  }

  /**
   * Get rating history for a recipe
   */
  getRatingHistory(recipeId: string): RatingEntry[] {
    const rows = this.db.exec(
      `SELECT id, recipe_id, rating, rated_at
       FROM ratings WHERE recipe_id = ? ORDER BY rated_at ASC`,
      [recipeId]
    );

    return rows.map((row) => ({
      id: row[0] as string,
      recipeId: row[1] as string,
      rating: row[2] as number,
      ratedAt: new Date(row[3] as string),
    }));
  }

  // ==================== Personal Statistics ====================

  /**
   * Get personal statistics for a period
   * Requirements: 28.1, 28.2, 28.3, 28.4
   */
  getPersonalStats(period?: StatisticsDateRange): PersonalStats {
    // Build date filter clause
    let dateFilter = '';
    const dateParams: unknown[] = [];
    if (period) {
      dateFilter = ' AND date >= ? AND date <= ?';
      dateParams.push(period.start.toISOString(), period.end.toISOString());
    }

    // Get total recipes in collection
    const totalRecipesRow = this.db.get<[number]>(
      `SELECT COUNT(*) FROM recipes WHERE archived_at IS NULL`
    );
    const totalRecipes = totalRecipesRow?.[0] ?? 0;

    // Get total cook sessions in period
    const totalSessionsRow = this.db.get<[number]>(
      `SELECT COUNT(*) FROM cook_sessions WHERE 1=1${dateFilter}`,
      dateParams
    );
    const totalCookSessions = totalSessionsRow?.[0] ?? 0;

    // Get unique recipes cooked in period
    const uniqueRecipesRow = this.db.get<[number]>(
      `SELECT COUNT(DISTINCT recipe_id) FROM cook_sessions WHERE 1=1${dateFilter}`,
      dateParams
    );
    const uniqueRecipesCooked = uniqueRecipesRow?.[0] ?? 0;

    // Get most cooked recipes in period
    const mostCookedRows = this.db.exec(
      `SELECT recipe_id, COUNT(*) as count FROM cook_sessions 
       WHERE 1=1${dateFilter}
       GROUP BY recipe_id ORDER BY count DESC LIMIT 10`,
      dateParams
    );
    const mostCookedRecipes: RecipeCount[] = mostCookedRows.map((row) => ({
      recipeId: row[0] as string,
      count: row[1] as number,
    }));

    // Get favorite tags (most frequently used tags from cooked recipes)
    const favoriteTagsRows = this.db.exec(
      `SELECT t.name, COUNT(*) as count 
       FROM cook_sessions cs
       JOIN recipe_tags rt ON cs.recipe_id = rt.recipe_id
       JOIN tags t ON rt.tag_id = t.id
       WHERE 1=1${dateFilter}
       GROUP BY t.name ORDER BY count DESC LIMIT 10`,
      dateParams
    );
    const favoriteTags: TagCount[] = favoriteTagsRows.map((row) => ({
      tag: row[0] as string,
      count: row[1] as number,
    }));

    // Calculate average cooks per week
    let avgCooksPerWeek = 0;
    if (totalCookSessions > 0) {
      if (period) {
        const startTime = period.start.getTime();
        const endTime = period.end.getTime();
        const weeks = Math.max(1, (endTime - startTime) / (7 * 24 * 60 * 60 * 1000));
        avgCooksPerWeek = totalCookSessions / weeks;
      } else {
        // Get date range from actual cook sessions
        const dateRangeRow = this.db.get<[string, string]>(
          `SELECT MIN(date), MAX(date) FROM cook_sessions`
        );
        if (dateRangeRow && dateRangeRow[0] && dateRangeRow[1]) {
          const minDate = new Date(dateRangeRow[0]).getTime();
          const maxDate = new Date(dateRangeRow[1]).getTime();
          const weeks = Math.max(1, (maxDate - minDate) / (7 * 24 * 60 * 60 * 1000));
          avgCooksPerWeek = totalCookSessions / weeks;
        }
      }
    }

    return {
      totalRecipes,
      totalCookSessions,
      mostCookedRecipes,
      favoriteTags,
      avgCooksPerWeek,
      uniqueRecipesCooked,
    };
  }

  // ==================== Year in Review ====================

  /**
   * Get year in review statistics
   * Requirements: 29.1, 29.2, 29.3
   */
  getYearInReview(year: number): YearInReview {
    const yearStart = `${year}-01-01T00:00:00.000Z`;
    const yearEnd = `${year}-12-31T23:59:59.999Z`;

    // Get total cook sessions in the year
    const totalSessionsRow = this.db.get<[number]>(
      `SELECT COUNT(*) FROM cook_sessions WHERE date >= ? AND date <= ?`,
      [yearStart, yearEnd]
    );
    const totalCookSessions = totalSessionsRow?.[0] ?? 0;

    // Get unique recipes cooked in the year
    const uniqueRecipesRow = this.db.get<[number]>(
      `SELECT COUNT(DISTINCT recipe_id) FROM cook_sessions WHERE date >= ? AND date <= ?`,
      [yearStart, yearEnd]
    );
    const uniqueRecipesCooked = uniqueRecipesRow?.[0] ?? 0;

    // Get new recipes added in the year
    const newRecipesRow = this.db.get<[number]>(
      `SELECT COUNT(*) FROM recipes WHERE created_at >= ? AND created_at <= ?`,
      [yearStart, yearEnd]
    );
    const newRecipesAdded = newRecipesRow?.[0] ?? 0;

    // Get top recipes by cook count
    const topRecipesRows = this.db.exec(
      `SELECT recipe_id, COUNT(*) as count FROM cook_sessions 
       WHERE date >= ? AND date <= ?
       GROUP BY recipe_id ORDER BY count DESC LIMIT 10`,
      [yearStart, yearEnd]
    );
    const topRecipes: RecipeCount[] = topRecipesRows.map((row) => ({
      recipeId: row[0] as string,
      count: row[1] as number,
    }));

    // Get top tags by usage
    const topTagsRows = this.db.exec(
      `SELECT t.name, COUNT(*) as count 
       FROM cook_sessions cs
       JOIN recipe_tags rt ON cs.recipe_id = rt.recipe_id
       JOIN tags t ON rt.tag_id = t.id
       WHERE cs.date >= ? AND cs.date <= ?
       GROUP BY t.name ORDER BY count DESC LIMIT 10`,
      [yearStart, yearEnd]
    );
    const topTags: TagCount[] = topTagsRows.map((row) => ({
      tag: row[0] as string,
      count: row[1] as number,
    }));

    // Get monthly activity
    const monthlyActivity: MonthlyStats[] = [];
    for (let month = 1; month <= 12; month++) {
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
      const nextMonth = month === 12 ? `${year + 1}-01-01T00:00:00.000Z` : `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z`;
      
      const monthStatsRow = this.db.get<[number, number]>(
        `SELECT COUNT(*), COUNT(DISTINCT recipe_id) FROM cook_sessions 
         WHERE date >= ? AND date < ?`,
        [monthStart, nextMonth]
      );
      
      monthlyActivity.push({
        month,
        cookSessions: monthStatsRow?.[0] ?? 0,
        uniqueRecipes: monthStatsRow?.[1] ?? 0,
      });
    }

    // Calculate longest streak
    const longestStreak = this.calculateLongestStreak(yearStart, yearEnd);

    // Calculate total time spent cooking
    const totalTimeRow = this.db.get<[number, number]>(
      `SELECT COALESCE(SUM(actual_prep_minutes), 0), COALESCE(SUM(actual_cook_minutes), 0) 
       FROM cook_sessions WHERE date >= ? AND date <= ?`,
      [yearStart, yearEnd]
    );
    const totalMinutes = (totalTimeRow?.[0] ?? 0) + (totalTimeRow?.[1] ?? 0);

    return {
      year,
      totalCookSessions,
      uniqueRecipesCooked,
      newRecipesAdded,
      topRecipes,
      topTags,
      monthlyActivity,
      longestStreak,
      totalTimeSpentCooking: { minutes: totalMinutes },
    };
  }

  /**
   * Calculate the longest consecutive days cooking streak in a date range
   */
  private calculateLongestStreak(startDate: string, endDate: string): number {
    // Get all unique cook dates in the range
    const rows = this.db.exec(
      `SELECT DISTINCT date(date) as cook_date FROM cook_sessions 
       WHERE date >= ? AND date <= ?
       ORDER BY cook_date`,
      [startDate, endDate]
    );

    if (rows.length === 0) {
      return 0;
    }

    let longestStreak = 1;
    let currentStreak = 1;
    let prevDate: Date | null = null;

    for (const row of rows) {
      const currentDate = new Date(row[0] as string);
      
      if (prevDate) {
        // Check if this date is consecutive (next day)
        const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (diffDays === 1) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }
      
      prevDate = currentDate;
    }

    return longestStreak;
  }
}
