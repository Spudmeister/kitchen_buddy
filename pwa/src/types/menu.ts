/**
 * Menu-related types for Sous Chef PWA
 */

/**
 * Meal slot types
 */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * A menu for meal planning
 */
export interface Menu {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  assignments: MenuAssignment[];
  createdAt: Date;
}

/**
 * A recipe assignment to a menu slot
 */
export interface MenuAssignment {
  id: string;
  menuId: string;
  recipeId: string;
  date: Date;
  mealSlot: MealSlot;
  servings: number;
  cookDate: Date;
  leftoverExpiryDate?: Date;
  /** If this is a leftover meal, references the original assignment */
  leftoverFromAssignmentId?: string;
  /** If true, this meal is marked as using leftovers */
  isLeftover?: boolean;
}

/**
 * Available leftover for planning suggestions
 */
export interface AvailableLeftover {
  /** The original assignment that produced the leftovers */
  assignment: MenuAssignment;
  /** Recipe ID for the leftover */
  recipeId: string;
  /** Recipe title (for display) */
  recipeTitle?: string;
  /** When the leftovers expire */
  expiryDate: Date;
  /** Days until expiry (negative if expired) */
  daysUntilExpiry: number;
  /** Whether the leftover is expiring soon (within 1 day) */
  isExpiringSoon: boolean;
}

/**
 * Input for creating a menu
 */
export interface MenuInput {
  name: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Input for updating a menu
 */
export interface MenuUpdate {
  name?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Input for assigning a recipe to a menu
 */
export interface MenuAssignmentInput {
  recipeId: string;
  date: Date;
  mealSlot: MealSlot;
  servings?: number;
  cookDate?: Date;
  leftoverDurationDays?: number;
  /** If this is a leftover meal, references the original assignment */
  leftoverFromAssignmentId?: string;
  /** If true, this meal is marked as using leftovers */
  isLeftover?: boolean;
}
