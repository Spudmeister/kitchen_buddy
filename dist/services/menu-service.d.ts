/**
 * Menu Service - Business logic for menu planning
 *
 * Provides CRUD operations for menus and recipe assignments.
 * Requirements: 4.1, 4.3, 4.4, 4.5, 12.5
 */
import type { Database } from '../db/database.js';
import type { Menu, MenuInput, MenuUpdate, MenuAssignment, MenuAssignmentInput, MealSlot } from '../types/menu.js';
import type { Duration } from '../types/units.js';
/**
 * Time estimate for a recipe, with source information
 */
export interface RecipeTimeEstimate {
    /** Recipe ID */
    recipeId: string;
    /** Estimated prep time */
    prepTime: Duration;
    /** Estimated cook time */
    cookTime: Duration;
    /** Total time (prep + cook) */
    totalTime: Duration;
    /** Source of the estimate: 'statistical' if from cook sessions, 'recipe' if from recipe definition */
    source: 'statistical' | 'recipe';
}
/**
 * Time estimate for an entire menu
 */
export interface MenuTimeEstimate {
    /** Menu ID */
    menuId: string;
    /** Total prep time for all recipes */
    totalPrepTime: Duration;
    /** Total cook time for all recipes */
    totalCookTime: Duration;
    /** Total time for all recipes */
    totalTime: Duration;
    /** Individual recipe estimates */
    recipeEstimates: RecipeTimeEstimate[];
}
/**
 * Service for managing menus and meal planning
 */
export declare class MenuService {
    private db;
    constructor(db: Database);
    /**
     * Create a new menu
     * Requirements: 4.1 - Allow assignment of recipes to specific dates and meal slots
     * Requirements: 4.5 - Support any arbitrary date range
     */
    createMenu(input: MenuInput): Menu;
    /**
     * Get a menu by ID
     * Requirements: 4.2 - Display recipes organized by date with cook dates and leftover dates
     */
    getMenu(id: string): Menu | undefined;
    /**
     * Update a menu
     */
    updateMenu(id: string, updates: MenuUpdate): Menu;
    /**
     * Delete a menu and all its assignments
     */
    deleteMenu(id: string): void;
    /**
     * Assign a recipe to a menu
     * Requirements: 4.1 - Allow assignment of recipes to specific dates and meal slots
     * Requirements: 4.3 - Calculate and display the leftover expiration date
     */
    assignRecipe(menuId: string, input: MenuAssignmentInput): MenuAssignment;
    /**
     * Remove a recipe assignment from a menu
     */
    removeAssignment(menuId: string, assignmentId: string): void;
    /**
     * Move an assignment to a different date/slot
     * Requirements: 4.4 - Update the assignment and recalculate leftover dates
     */
    moveAssignment(menuId: string, assignmentId: string, newDate: Date, newMealSlot?: MealSlot, newCookDate?: Date): MenuAssignment;
    /**
     * Calculate leftover expiration date
     * Requirements: 4.3 - Calculate and display the leftover expiration date
     */
    calculateLeftoverDate(cookDate: Date, durationDays?: number): Date;
    /**
     * Get time estimate for a single recipe
     * Requirements: 12.5 - Use statistical averages when available, falling back to recipe estimates
     *
     * @param recipeId - The recipe ID to get time estimate for
     * @returns Time estimate with source information, or undefined if recipe not found
     */
    getRecipeTimeEstimate(recipeId: string): RecipeTimeEstimate | undefined;
    /**
     * Get time estimate for an entire menu
     * Requirements: 12.5 - Use statistical averages when available, falling back to recipe estimates
     *
     * @param menuId - The menu ID to get time estimate for
     * @returns Menu time estimate with individual recipe estimates
     */
    getMenuTimeEstimate(menuId: string): MenuTimeEstimate | undefined;
    /**
     * Check if a menu exists
     */
    exists(id: string): boolean;
    /**
     * Get all menus
     */
    getAllMenus(): Menu[];
    private getAssignment;
    private getAssignments;
    private formatDate;
}
//# sourceMappingURL=menu-service.d.ts.map