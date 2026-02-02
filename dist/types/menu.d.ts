/**
 * Menu planning types for Sous Chef
 */
/**
 * Meal slot for menu assignments
 */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
/**
 * Date range for menus
 */
export interface DateRange {
    /** Start date (inclusive) */
    startDate: Date;
    /** End date (inclusive) */
    endDate: Date;
}
/**
 * A menu for planning meals over a date range
 */
export interface Menu {
    /** Unique identifier */
    id: string;
    /** Menu name */
    name: string;
    /** Start date of the menu */
    startDate: Date;
    /** End date of the menu */
    endDate: Date;
    /** Recipe assignments in this menu */
    assignments: MenuAssignment[];
    /** When the menu was created */
    createdAt: Date;
}
/**
 * A recipe assignment within a menu
 */
export interface MenuAssignment {
    /** Unique identifier */
    id: string;
    /** Menu this assignment belongs to */
    menuId: string;
    /** Recipe ID */
    recipeId: string;
    /** Date for this meal */
    date: Date;
    /** Meal slot (breakfast, lunch, dinner, snack) */
    mealSlot: MealSlot;
    /** Number of servings */
    servings: number;
    /** Date when the recipe will be cooked */
    cookDate: Date;
    /** Date when leftovers expire */
    leftoverExpiryDate?: Date;
}
/**
 * Input for creating a new menu
 */
export interface MenuInput {
    /** Menu name */
    name: string;
    /** Start date of the menu */
    startDate: Date;
    /** End date of the menu */
    endDate: Date;
}
/**
 * Input for updating a menu
 */
export interface MenuUpdate {
    /** New menu name */
    name?: string;
    /** New start date */
    startDate?: Date;
    /** New end date */
    endDate?: Date;
}
/**
 * Input for assigning a recipe to a menu
 */
export interface MenuAssignmentInput {
    /** Recipe ID to assign */
    recipeId: string;
    /** Date for this meal */
    date: Date;
    /** Meal slot */
    mealSlot: MealSlot;
    /** Number of servings (defaults to recipe servings) */
    servings?: number;
    /** Date when the recipe will be cooked (defaults to date) */
    cookDate?: Date;
    /** Custom leftover duration in days (overrides recipe/default) */
    leftoverDurationDays?: number;
}
//# sourceMappingURL=menu.d.ts.map