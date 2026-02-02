/**
 * Menu Service - Business logic for menu planning
 *
 * Provides CRUD operations for menus and recipe assignments.
 * Requirements: 4.1, 4.3, 4.4, 4.5, 12.5
 */
import { v4 as uuidv4 } from 'uuid';
/** Default leftover duration in days if not specified */
const DEFAULT_LEFTOVER_DURATION_DAYS = 3;
/**
 * Service for managing menus and meal planning
 */
export class MenuService {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Create a new menu
     * Requirements: 4.1 - Allow assignment of recipes to specific dates and meal slots
     * Requirements: 4.5 - Support any arbitrary date range
     */
    createMenu(input) {
        const menuId = uuidv4();
        const now = new Date().toISOString();
        // Validate date range
        if (input.startDate > input.endDate) {
            throw new Error('Start date must be before or equal to end date');
        }
        this.db.run(`INSERT INTO menus (id, name, start_date, end_date, created_at)
       VALUES (?, ?, ?, ?, ?)`, [
            menuId,
            input.name,
            this.formatDate(input.startDate),
            this.formatDate(input.endDate),
            now,
        ]);
        return this.getMenu(menuId);
    }
    /**
     * Get a menu by ID
     * Requirements: 4.2 - Display recipes organized by date with cook dates and leftover dates
     */
    getMenu(id) {
        const menuRow = this.db.get('SELECT id, name, start_date, end_date, created_at FROM menus WHERE id = ?', [id]);
        if (!menuRow) {
            return undefined;
        }
        const [menuId, name, startDate, endDate, createdAt] = menuRow;
        // Get assignments
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
    updateMenu(id, updates) {
        const menu = this.getMenu(id);
        if (!menu) {
            throw new Error(`Menu not found: ${id}`);
        }
        const newName = updates.name ?? menu.name;
        const newStartDate = updates.startDate ?? menu.startDate;
        const newEndDate = updates.endDate ?? menu.endDate;
        // Validate date range
        if (newStartDate > newEndDate) {
            throw new Error('Start date must be before or equal to end date');
        }
        this.db.run(`UPDATE menus SET name = ?, start_date = ?, end_date = ? WHERE id = ?`, [newName, this.formatDate(newStartDate), this.formatDate(newEndDate), id]);
        return this.getMenu(id);
    }
    /**
     * Delete a menu and all its assignments
     */
    deleteMenu(id) {
        const menu = this.getMenu(id);
        if (!menu) {
            throw new Error(`Menu not found: ${id}`);
        }
        this.db.transaction(() => {
            // Delete assignments first
            this.db.run('DELETE FROM menu_assignments WHERE menu_id = ?', [id]);
            // Delete menu
            this.db.run('DELETE FROM menus WHERE id = ?', [id]);
        });
    }
    /**
     * Assign a recipe to a menu
     * Requirements: 4.1 - Allow assignment of recipes to specific dates and meal slots
     * Requirements: 4.3 - Calculate and display the leftover expiration date
     */
    assignRecipe(menuId, input) {
        const menu = this.getMenu(menuId);
        if (!menu) {
            throw new Error(`Menu not found: ${menuId}`);
        }
        // Validate date is within menu range
        const assignmentDate = input.date;
        if (assignmentDate < menu.startDate || assignmentDate > menu.endDate) {
            throw new Error('Assignment date must be within menu date range');
        }
        const assignmentId = uuidv4();
        const cookDate = input.cookDate ?? input.date;
        const leftoverDurationDays = input.leftoverDurationDays ?? DEFAULT_LEFTOVER_DURATION_DAYS;
        const leftoverExpiryDate = this.calculateLeftoverDate(cookDate, leftoverDurationDays);
        this.db.run(`INSERT INTO menu_assignments (id, menu_id, recipe_id, date, meal_slot, servings, cook_date, leftover_expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            assignmentId,
            menuId,
            input.recipeId,
            this.formatDate(input.date),
            input.mealSlot,
            input.servings ?? 4,
            this.formatDate(cookDate),
            this.formatDate(leftoverExpiryDate),
        ]);
        return this.getAssignment(assignmentId);
    }
    /**
     * Remove a recipe assignment from a menu
     */
    removeAssignment(menuId, assignmentId) {
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
     * Requirements: 4.4 - Update the assignment and recalculate leftover dates
     */
    moveAssignment(menuId, assignmentId, newDate, newMealSlot, newCookDate) {
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
        // Validate new date is within menu range
        if (newDate < menu.startDate || newDate > menu.endDate) {
            throw new Error('New date must be within menu date range');
        }
        const cookDate = newCookDate ?? newDate;
        const leftoverExpiryDate = this.calculateLeftoverDate(cookDate, DEFAULT_LEFTOVER_DURATION_DAYS);
        const mealSlot = newMealSlot ?? assignment.mealSlot;
        this.db.run(`UPDATE menu_assignments 
       SET date = ?, meal_slot = ?, cook_date = ?, leftover_expiry_date = ?
       WHERE id = ?`, [
            this.formatDate(newDate),
            mealSlot,
            this.formatDate(cookDate),
            this.formatDate(leftoverExpiryDate),
            assignmentId,
        ]);
        return this.getAssignment(assignmentId);
    }
    /**
     * Calculate leftover expiration date
     * Requirements: 4.3 - Calculate and display the leftover expiration date
     */
    calculateLeftoverDate(cookDate, durationDays = DEFAULT_LEFTOVER_DURATION_DAYS) {
        const expiryDate = new Date(cookDate);
        expiryDate.setDate(expiryDate.getDate() + durationDays);
        return expiryDate;
    }
    /**
     * Get time estimate for a single recipe
     * Requirements: 12.5 - Use statistical averages when available, falling back to recipe estimates
     *
     * @param recipeId - The recipe ID to get time estimate for
     * @returns Time estimate with source information, or undefined if recipe not found
     */
    getRecipeTimeEstimate(recipeId) {
        // First, try to get statistical averages from cook sessions
        const statsRow = this.db.get(`SELECT AVG(actual_prep_minutes), AVG(actual_cook_minutes)
       FROM cook_sessions 
       WHERE recipe_id = ? 
       AND (actual_prep_minutes IS NOT NULL OR actual_cook_minutes IS NOT NULL)`, [recipeId]);
        const avgPrepMinutes = statsRow?.[0];
        const avgCookMinutes = statsRow?.[1];
        // Check if we have statistical data
        if (avgPrepMinutes !== null || avgCookMinutes !== null) {
            // We have at least some statistical data
            // Get recipe estimates as fallback for missing stats
            const recipeRow = this.db.get(`SELECT rv.prep_time_minutes, rv.cook_time_minutes
         FROM recipes r
         JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
         WHERE r.id = ?`, [recipeId]);
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
        // No statistical data, fall back to recipe estimates
        const recipeRow = this.db.get(`SELECT rv.prep_time_minutes, rv.cook_time_minutes
       FROM recipes r
       JOIN recipe_versions rv ON r.id = rv.recipe_id AND r.current_version = rv.version
       WHERE r.id = ?`, [recipeId]);
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
     * Requirements: 12.5 - Use statistical averages when available, falling back to recipe estimates
     *
     * @param menuId - The menu ID to get time estimate for
     * @returns Menu time estimate with individual recipe estimates
     */
    getMenuTimeEstimate(menuId) {
        const menu = this.getMenu(menuId);
        if (!menu) {
            return undefined;
        }
        // Get unique recipe IDs from assignments
        const uniqueRecipeIds = [...new Set(menu.assignments.map(a => a.recipeId))];
        // Get time estimates for each recipe
        const recipeEstimates = [];
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
     * Check if a menu exists
     */
    exists(id) {
        const row = this.db.get('SELECT 1 FROM menus WHERE id = ?', [id]);
        return row !== undefined;
    }
    /**
     * Get all menus
     */
    getAllMenus() {
        const menuRows = this.db.exec('SELECT id FROM menus ORDER BY start_date DESC');
        return menuRows
            .map((row) => this.getMenu(row[0]))
            .filter((m) => m !== undefined);
    }
    // Private helper methods
    getAssignment(id) {
        const row = this.db.get(`SELECT id, menu_id, recipe_id, date, meal_slot, servings, cook_date, leftover_expiry_date
       FROM menu_assignments WHERE id = ?`, [id]);
        if (!row) {
            return undefined;
        }
        const [assignmentId, menuId, recipeId, date, mealSlot, servings, cookDate, leftoverExpiryDate] = row;
        return {
            id: assignmentId,
            menuId,
            recipeId,
            date: new Date(date),
            mealSlot: mealSlot,
            servings,
            cookDate: new Date(cookDate),
            leftoverExpiryDate: leftoverExpiryDate ? new Date(leftoverExpiryDate) : undefined,
        };
    }
    getAssignments(menuId) {
        const rows = this.db.exec(`SELECT id, menu_id, recipe_id, date, meal_slot, servings, cook_date, leftover_expiry_date
       FROM menu_assignments WHERE menu_id = ? ORDER BY date, meal_slot`, [menuId]);
        return rows.map((row) => ({
            id: row[0],
            menuId: row[1],
            recipeId: row[2],
            date: new Date(row[3]),
            mealSlot: row[4],
            servings: row[5],
            cookDate: new Date(row[6]),
            leftoverExpiryDate: row[7] ? new Date(row[7]) : undefined,
        }));
    }
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}
//# sourceMappingURL=menu-service.js.map