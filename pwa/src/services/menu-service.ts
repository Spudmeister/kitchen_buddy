/**
 * Menu Service - Browser-adapted version for PWA
 *
 * Provides CRUD operations for menus and recipe assignments.
 * Adapted from the main Sous Chef service for browser environment.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { v4 as uuidv4 } from 'uuid';
import type { BrowserDatabase } from '@db/browser-database';
import type {
  Menu,
  MenuInput,
  MenuUpdate,
  MenuAssignment,
  MenuAssignmentInput,
  MealSlot,
  AvailableLeftover,
} from '@app-types/menu';
import type { Duration } from '@app-types/units';

/** Default leftover duration in days if not specified */
const DEFAULT_LEFTOVER_DURATION_DAYS = 3;

/**
 * Time estimate for a recipe, with source information
 */
export interface RecipeTimeEstimate {
  recipeId: string;
  prepTime: Duration;
  cookTime: Duration;
  totalTime: Duration;
  source: 'statistical' | 'recipe';
}

/**
 * Time estimate for an entire menu
 */
export interface MenuTimeEstimate {
  menuId: string;
  totalPrepTime: Duration;
  totalCookTime: Duration;
  totalTime: Duration;
  recipeEstimates: RecipeTimeEstimate[];
}

/**
 * Daily time estimate for menu planning
 */
export interface DailyTimeEstimate {
  date: Date;
  totalPrepTime: Duration;
  totalCookTime: Duration;
  totalTime: Duration;
}

/**
 * Service for managing menus and meal planning
 */
export class MenuService {
  constructor(private db: BrowserDatabase) {}

  /**
   * Create a new menu
   */
  createMenu(input: MenuInput): Menu {
    const menuId = uuidv4();
    const now = new Date().toISOString();

    if (input.startDate > input.endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    this.db.run(
      `INSERT INTO menus (id, name, start_date, end_date, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        menuId,
        input.name,
        this.formatDate(input.startDate),
        this.formatDate(input.endDate),
        now,
      ]
    );

    return this.getMenu(menuId)!;
  }

  /**
   * Get a menu by ID
   */
  getMenu(id: string): Menu | undefined {
    const menuRow = this.db.get<[string, string, string, string, string]>(
      'SELECT id, name, start_date, end_date, created_at FROM menus WHERE id = ?',
      [id]
    );

    if (!menuRow) {
      return undefined;
    }

    const [menuId, name, startDate, endDate, createdAt] = menuRow;
    const assignments = this.getAssignments(menuId);

    return {
      id: menuId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      assignments,
      createdAt: new Date(createdAt),
    };
  }

  /**
   * Update a menu
   */
  updateMenu(id: string, updates: MenuUpdate): Menu {
    const menu = this.getMenu(id);
    if (!menu) {
      throw new Error(`Menu not found: ${id}`);
    }

    const newName = updates.name ?? menu.name;
    const newStartDate = updates.startDate ?? menu.startDate;
    const newEndDate = updates.endDate ?? menu.endDate;

    if (newStartDate > newEndDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    this.db.run(
      `UPDATE menus SET name = ?, start_date = ?, end_date = ? WHERE id = ?`,
      [newName, this.formatDate(newStartDate), this.formatDate(newEndDate), id]
    );

    return this.getMenu(id)!;
  }

  /**
   * Delete a menu and all its assignments
   */
  deleteMenu(id: string): void {
    const menu = this.getMenu(id);
    if (!menu) {
      throw new Error(`Menu not found: ${id}`);
    }

    return this.db.transaction(() => {
      this.db.run('DELETE FROM menu_assignments WHERE menu_id = ?', [id]);
      this.db.run('DELETE FROM menus WHERE id = ?', [id]);
    });
  }

  /**
   * Assign a recipe to a menu
   */
  assignRecipe(menuId: string, input: MenuAssignmentInput): MenuAssignment {
    const menu = this.getMenu(menuId);
    if (!menu) {
      throw new Error(`Menu not found: ${menuId}`);
    }

    const assignmentDate = input.date;
    if (assignmentDate < menu.startDate || assignmentDate > menu.endDate) {
      throw new Error('Assignment date must be within menu date range');
    }

    const assignmentId = uuidv4();
    const isLeftover = input.isLeftover ?? false;
    
    // For leftover meals, use the original cook date from the source assignment
    let cookDate = input.cookDate ?? input.date;
    let leftoverExpiryDate: Date | null = null;
    
    if (isLeftover && input.leftoverFromAssignmentId) {
      // Get the original assignment to use its cook date and expiry
      const originalAssignment = this.getAssignment(input.leftoverFromAssignmentId);
      if (originalAssignment) {
        cookDate = originalAssignment.cookDate;
        leftoverExpiryDate = originalAssignment.leftoverExpiryDate ?? null;
      }
    } else if (!isLeftover) {
      // Only calculate expiry for non-leftover meals (fresh cooking)
      const leftoverDurationDays = input.leftoverDurationDays ?? DEFAULT_LEFTOVER_DURATION_DAYS;
      leftoverExpiryDate = this.calculateLeftoverDate(cookDate, leftoverDurationDays);
    }

    this.db.run(
      `INSERT INTO menu_assignments (id, menu_id, recipe_id, date, meal_slot, servings, cook_date, leftover_expiry_date, leftover_from_assignment_id, is_leftover)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        menuId,
        input.recipeId,
        this.formatDate(input.date),
        input.mealSlot,
        input.servings ?? 4,
        this.formatDate(cookDate),
        leftoverExpiryDate ? this.formatDate(leftoverExpiryDate) : null,
        input.leftoverFromAssignmentId ?? null,
        isLeftover ? 1 : 0,
      ]
    );

    return this.getAssignment(assignmentId)!;
  }

  /**
   * Remove a recipe assignment from a menu
   */
  removeAssignment(menuId: string, assignmentId: string): void {
    const assignment = this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }
    if (assignment.menuId !== menuId) {
      throw new Error(`Assignment ${assignmentId} does not belong to menu ${menuId}`);
    }

    this.db.run('DELETE FROM menu_assignments WHERE id = ?', [assignmentId]);
  }

  /**
   * Move an assignment to a different date/slot
   */
  moveAssignment(
    menuId: string,
    assignmentId: string,
    newDate: Date,
    newMealSlot?: MealSlot,
    newCookDate?: Date
  ): MenuAssignment {
    const menu = this.getMenu(menuId);
    if (!menu) {
      throw new Error(`Menu not found: ${menuId}`);
    }

    const assignment = this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }
    if (assignment.menuId !== menuId) {
      throw new Error(`Assignment ${assignmentId} does not belong to menu ${menuId}`);
    }

    if (newDate < menu.startDate || newDate > menu.endDate) {
      throw new Error('New date must be within menu date range');
    }

    const cookDate = newCookDate ?? newDate;
    const leftoverExpiryDate = this.calculateLeftoverDate(cookDate, DEFAULT_LEFTOVER_DURATION_DAYS);
    const mealSlot = newMealSlot ?? assignment.mealSlot;

    this.db.run(
      `UPDATE menu_assignments 
       SET date = ?, meal_slot = ?, cook_date = ?, leftover_expiry_date = ?
       WHERE id = ?`,
      [
        this.formatDate(newDate),
        mealSlot,
        this.formatDate(cookDate),
        this.formatDate(leftoverExpiryDate),
        assignmentId,
      ]
    );

    return this.getAssignment(assignmentId)!;
  }

  /**
   * Calculate leftover expiration date
   */
  calculateLeftoverDate(cookDate: Date, durationDays: number = DEFAULT_LEFTOVER_DURATION_DAYS): Date {
    const expiryDate = new Date(cookDate);
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    return expiryDate;
  }

  /**
   * Get time estimate for a single recipe
   */
  getRecipeTimeEstimate(recipeId: string): RecipeTimeEstimate | undefined {
    // Try to get statistical averages from cook sessions
    const statsRow = this.db.get<[number | null, number | null]>(
      `SELECT AVG(actual_prep_minutes), AVG(actual_cook_minutes)
       FROM cook_sessions 
       WHERE recipe_id = ? 
       AND (actual_prep_minutes IS NOT NULL OR actual_cook_minutes IS NOT NULL)`,
      [recipeId]
    );

    const avgPrepMinutes = statsRow?.[0];
    const avgCookMinutes = statsRow?.[1];

    if (avgPrepMinutes !== null || avgCookMinutes !== null) {
      const recipeRow = this.db.get<[number | null, number | null]>(
        `SELECT rv.prep_time_minutes, rv.cook_time_minutes
         FROM recipes r
         JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
         WHERE r.id = ?`,
        [recipeId]
      );

      if (!recipeRow) {
        return undefined;
      }

      const prepMinutes = avgPrepMinutes != null ? Math.round(avgPrepMinutes) : (recipeRow[0] ?? 0);
      const cookMinutes = avgCookMinutes != null ? Math.round(avgCookMinutes) : (recipeRow[1] ?? 0);

      return {
        recipeId,
        prepTime: { minutes: prepMinutes },
        cookTime: { minutes: cookMinutes },
        totalTime: { minutes: prepMinutes + cookMinutes },
        source: 'statistical',
      };
    }

    // Fall back to recipe estimates
    const recipeRow = this.db.get<[number | null, number | null]>(
      `SELECT rv.prep_time_minutes, rv.cook_time_minutes
       FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
       WHERE r.id = ?`,
      [recipeId]
    );

    if (!recipeRow) {
      return undefined;
    }

    const prepMinutes = recipeRow[0] ?? 0;
    const cookMinutes = recipeRow[1] ?? 0;

    return {
      recipeId,
      prepTime: { minutes: prepMinutes },
      cookTime: { minutes: cookMinutes },
      totalTime: { minutes: prepMinutes + cookMinutes },
      source: 'recipe',
    };
  }

  /**
   * Get time estimate for an entire menu
   */
  getMenuTimeEstimate(menuId: string): MenuTimeEstimate | undefined {
    const menu = this.getMenu(menuId);
    if (!menu) {
      return undefined;
    }

    const uniqueRecipeIds = [...new Set(menu.assignments.map(a => a.recipeId))];
    const recipeEstimates: RecipeTimeEstimate[] = [];
    let totalPrepMinutes = 0;
    let totalCookMinutes = 0;

    for (const recipeId of uniqueRecipeIds) {
      const estimate = this.getRecipeTimeEstimate(recipeId);
      if (estimate) {
        recipeEstimates.push(estimate);
        totalPrepMinutes += estimate.prepTime.minutes;
        totalCookMinutes += estimate.cookTime.minutes;
      }
    }

    return {
      menuId,
      totalPrepTime: { minutes: totalPrepMinutes },
      totalCookTime: { minutes: totalCookMinutes },
      totalTime: { minutes: totalPrepMinutes + totalCookMinutes },
      recipeEstimates,
    };
  }

  /**
   * Get daily time estimates for a menu
   * Requirements: 13.5 - Show total cook time per day
   */
  getDailyTimeEstimates(menuId: string): DailyTimeEstimate[] {
    const menu = this.getMenu(menuId);
    if (!menu) {
      return [];
    }

    // Group assignments by date
    const assignmentsByDate = new Map<string, MenuAssignment[]>();
    for (const assignment of menu.assignments) {
      const dateKey = this.formatDate(assignment.date);
      const existing = assignmentsByDate.get(dateKey) || [];
      existing.push(assignment);
      assignmentsByDate.set(dateKey, existing);
    }

    // Calculate time estimates for each day
    const dailyEstimates: DailyTimeEstimate[] = [];
    for (const [dateKey, assignments] of assignmentsByDate) {
      let totalPrepMinutes = 0;
      let totalCookMinutes = 0;

      for (const assignment of assignments) {
        const estimate = this.getRecipeTimeEstimate(assignment.recipeId);
        if (estimate) {
          totalPrepMinutes += estimate.prepTime.minutes;
          totalCookMinutes += estimate.cookTime.minutes;
        }
      }

      dailyEstimates.push({
        date: new Date(dateKey),
        totalPrepTime: { minutes: totalPrepMinutes },
        totalCookTime: { minutes: totalCookMinutes },
        totalTime: { minutes: totalPrepMinutes + totalCookMinutes },
      });
    }

    return dailyEstimates.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get available leftovers for a given date
   * Requirements: 17.3 - Suggest available leftovers when planning
   * 
   * Returns assignments that have leftovers still valid on the target date
   */
  getAvailableLeftovers(menuId: string, targetDate: Date): AvailableLeftover[] {
    const menu = this.getMenu(menuId);
    if (!menu) {
      return [];
    }

    const targetDateStr = this.formatDate(targetDate);
    const now = new Date();
    const availableLeftovers: AvailableLeftover[] = [];

    for (const assignment of menu.assignments) {
      // Skip leftover meals themselves - we only want original cooked meals
      if (assignment.isLeftover) {
        continue;
      }

      // Skip if no expiry date
      if (!assignment.leftoverExpiryDate) {
        continue;
      }

      // Check if the cook date is before or on the target date
      // (can't have leftovers from something not yet cooked)
      if (assignment.cookDate > targetDate) {
        continue;
      }

      // Check if leftovers are still valid on the target date
      if (assignment.leftoverExpiryDate < targetDate) {
        continue;
      }

      // Get recipe title for display
      const recipeRow = this.db.get<[string]>(
        `SELECT rv.title
         FROM recipes r
         JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
         WHERE r.id = ?`,
        [assignment.recipeId]
      );

      const daysUntilExpiry = Math.ceil(
        (assignment.leftoverExpiryDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      availableLeftovers.push({
        assignment,
        recipeId: assignment.recipeId,
        recipeTitle: recipeRow?.[0],
        expiryDate: assignment.leftoverExpiryDate,
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry <= 1,
      });
    }

    // Sort by expiry date (soonest first) to prioritize using expiring leftovers
    return availableLeftovers.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }

  /**
   * Get all assignments with expiring leftovers
   * Requirements: 17.2 - Highlight recipes with expiring leftovers
   */
  getExpiringLeftovers(menuId: string, withinDays: number = 1): AvailableLeftover[] {
    const menu = this.getMenu(menuId);
    if (!menu) {
      return [];
    }

    const now = new Date();
    const expiringLeftovers: AvailableLeftover[] = [];

    for (const assignment of menu.assignments) {
      // Skip leftover meals themselves
      if (assignment.isLeftover) {
        continue;
      }

      // Skip if no expiry date
      if (!assignment.leftoverExpiryDate) {
        continue;
      }

      // Check if already expired
      if (assignment.leftoverExpiryDate < now) {
        continue;
      }

      const daysUntilExpiry = Math.ceil(
        (assignment.leftoverExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only include if expiring within the specified days
      if (daysUntilExpiry > withinDays) {
        continue;
      }

      // Get recipe title for display
      const recipeRow = this.db.get<[string]>(
        `SELECT rv.title
         FROM recipes r
         JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
         WHERE r.id = ?`,
        [assignment.recipeId]
      );

      expiringLeftovers.push({
        assignment,
        recipeId: assignment.recipeId,
        recipeTitle: recipeRow?.[0],
        expiryDate: assignment.leftoverExpiryDate,
        daysUntilExpiry,
        isExpiringSoon: true,
      });
    }

    // Sort by expiry date (soonest first)
    return expiringLeftovers.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }

  /**
   * Mark a meal as using leftovers from another assignment
   * Requirements: 17.4 - Allow marking meal as "leftovers from [recipe]"
   */
  markAsLeftover(
    menuId: string,
    assignmentId: string,
    sourceAssignmentId: string
  ): MenuAssignment {
    const menu = this.getMenu(menuId);
    if (!menu) {
      throw new Error(`Menu not found: ${menuId}`);
    }

    const assignment = this.getAssignment(assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    const sourceAssignment = this.getAssignment(sourceAssignmentId);
    if (!sourceAssignment) {
      throw new Error(`Source assignment not found: ${sourceAssignmentId}`);
    }

    // Update the assignment to mark it as a leftover
    this.db.run(
      `UPDATE menu_assignments 
       SET is_leftover = 1, 
           leftover_from_assignment_id = ?,
           recipe_id = ?,
           cook_date = ?,
           leftover_expiry_date = ?
       WHERE id = ?`,
      [
        sourceAssignmentId,
        sourceAssignment.recipeId,
        this.formatDate(sourceAssignment.cookDate),
        sourceAssignment.leftoverExpiryDate ? this.formatDate(sourceAssignment.leftoverExpiryDate) : null,
        assignmentId,
      ]
    );

    return this.getAssignment(assignmentId)!;
  }

  /**
   * Create a leftover meal assignment
   * Requirements: 17.4 - Allow marking meal as "leftovers from [recipe]"
   */
  assignLeftover(
    menuId: string,
    sourceAssignmentId: string,
    date: Date,
    mealSlot: MealSlot,
    servings?: number
  ): MenuAssignment {
    const sourceAssignment = this.getAssignment(sourceAssignmentId);
    if (!sourceAssignment) {
      throw new Error(`Source assignment not found: ${sourceAssignmentId}`);
    }

    return this.assignRecipe(menuId, {
      recipeId: sourceAssignment.recipeId,
      date,
      mealSlot,
      servings: servings ?? sourceAssignment.servings,
      cookDate: sourceAssignment.cookDate,
      leftoverFromAssignmentId: sourceAssignmentId,
      isLeftover: true,
    });
  }

  /**
   * Get all menus
   */
  getAllMenus(): Menu[] {
    const menuRows = this.db.exec(
      'SELECT id FROM menus ORDER BY start_date DESC'
    );

    return menuRows
      .map((row) => this.getMenu(row[0] as string))
      .filter((m): m is Menu => m !== undefined);
  }

  /**
   * Get current or upcoming menu
   */
  getCurrentMenu(): Menu | undefined {
    const today = this.formatDate(new Date());
    
    // First try to find a menu that includes today
    const currentRow = this.db.get<[string]>(
      `SELECT id FROM menus 
       WHERE start_date <= ? AND end_date >= ?
       ORDER BY start_date DESC
       LIMIT 1`,
      [today, today]
    );

    if (currentRow) {
      return this.getMenu(currentRow[0]);
    }

    // Otherwise get the next upcoming menu
    const upcomingRow = this.db.get<[string]>(
      `SELECT id FROM menus 
       WHERE start_date > ?
       ORDER BY start_date ASC
       LIMIT 1`,
      [today]
    );

    if (upcomingRow) {
      return this.getMenu(upcomingRow[0]);
    }

    // Fall back to most recent menu
    const recentRow = this.db.get<[string]>(
      `SELECT id FROM menus 
       ORDER BY end_date DESC
       LIMIT 1`,
      []
    );

    return recentRow ? this.getMenu(recentRow[0]) : undefined;
  }

  /**
   * Check if a menu exists
   */
  exists(id: string): boolean {
    const row = this.db.get<[number]>('SELECT 1 FROM menus WHERE id = ?', [id]);
    return row !== undefined;
  }

  // Private helper methods

  private getAssignment(id: string): MenuAssignment | undefined {
    const row = this.db.get<[string, string, string, string, string, number, string, string | null, string | null, number]>(
      `SELECT id, menu_id, recipe_id, date, meal_slot, servings, cook_date, leftover_expiry_date, leftover_from_assignment_id, is_leftover
       FROM menu_assignments WHERE id = ?`,
      [id]
    );

    if (!row) {
      return undefined;
    }

    const [assignmentId, menuId, recipeId, date, mealSlot, servings, cookDate, leftoverExpiryDate, leftoverFromAssignmentId, isLeftover] = row;

    return {
      id: assignmentId,
      menuId,
      recipeId,
      date: new Date(date),
      mealSlot: mealSlot as MealSlot,
      servings,
      cookDate: new Date(cookDate),
      leftoverExpiryDate: leftoverExpiryDate ? new Date(leftoverExpiryDate) : undefined,
      leftoverFromAssignmentId: leftoverFromAssignmentId ?? undefined,
      isLeftover: isLeftover === 1,
    };
  }

  private getAssignments(menuId: string): MenuAssignment[] {
    const rows = this.db.exec(
      `SELECT id, menu_id, recipe_id, date, meal_slot, servings, cook_date, leftover_expiry_date, leftover_from_assignment_id, is_leftover
       FROM menu_assignments WHERE menu_id = ? ORDER BY date, meal_slot`,
      [menuId]
    );

    return rows.map((row) => ({
      id: row[0] as string,
      menuId: row[1] as string,
      recipeId: row[2] as string,
      date: new Date(row[3] as string),
      mealSlot: row[4] as MealSlot,
      servings: row[5] as number,
      cookDate: new Date(row[6] as string),
      leftoverExpiryDate: row[7] ? new Date(row[7] as string) : undefined,
      leftoverFromAssignmentId: row[8] as string | undefined,
      isLeftover: (row[9] as number) === 1,
    }));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }
}
