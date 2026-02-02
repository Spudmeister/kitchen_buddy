/**
 * Menu Test Fixtures for Sous Chef
 * 
 * Sample menu configurations covering:
 * - Single day menus
 * - Week-long menus
 * - Month-long menus
 * - Overlapping date ranges
 * - Edge cases
 * 
 * Requirements: Design - Testing Strategy
 */

import type { MenuInput, MenuAssignmentInput, MealSlot } from '../../src/types/menu.js';

/**
 * Helper to create a date relative to today
 */
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Helper to create a specific date
 */
function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/**
 * Single day menu
 */
export const singleDayMenu: MenuInput = {
  name: 'Single Day Menu',
  startDate: daysFromNow(0),
  endDate: daysFromNow(0),
};

/**
 * Weekend menu (2 days)
 */
export const weekendMenu: MenuInput = {
  name: 'Weekend Menu',
  startDate: daysFromNow(5), // Saturday
  endDate: daysFromNow(6),   // Sunday
};

/**
 * Week-long menu
 */
export const weekMenu: MenuInput = {
  name: 'Weekly Meal Plan',
  startDate: daysFromNow(0),
  endDate: daysFromNow(6),
};

/**
 * Two-week menu
 */
export const twoWeekMenu: MenuInput = {
  name: 'Bi-Weekly Plan',
  startDate: daysFromNow(0),
  endDate: daysFromNow(13),
};

/**
 * Month-long menu
 */
export const monthMenu: MenuInput = {
  name: 'Monthly Meal Plan',
  startDate: daysFromNow(0),
  endDate: daysFromNow(29),
};

/**
 * Menu spanning year boundary (edge case)
 */
export const yearBoundaryMenu: MenuInput = {
  name: 'New Year Menu',
  startDate: createDate(2025, 12, 28),
  endDate: createDate(2026, 1, 4),
};

/**
 * Menu for leap year February (edge case)
 */
export const leapYearMenu: MenuInput = {
  name: 'Leap Year February',
  startDate: createDate(2024, 2, 25),
  endDate: createDate(2024, 3, 3),
};

/**
 * Menu with same start and end date
 */
export const sameDayMenu: MenuInput = {
  name: 'Today Only',
  startDate: daysFromNow(0),
  endDate: daysFromNow(0),
};

/**
 * Future menu (planning ahead)
 */
export const futureMenu: MenuInput = {
  name: 'Future Planning',
  startDate: daysFromNow(30),
  endDate: daysFromNow(36),
};

/**
 * Menu with Unicode name
 */
export const unicodeMenu: MenuInput = {
  name: '週末の食事計画 🍱 Weekend Meals',
  startDate: daysFromNow(0),
  endDate: daysFromNow(2),
};

/**
 * Menu with special characters
 */
export const specialCharsMenu: MenuInput = {
  name: "John's Birthday Party — Special Menu!",
  startDate: daysFromNow(10),
  endDate: daysFromNow(10),
};

/**
 * Long duration menu (90 days)
 */
export const longDurationMenu: MenuInput = {
  name: 'Quarterly Meal Plan',
  startDate: daysFromNow(0),
  endDate: daysFromNow(89),
};

/**
 * Collection of all menu fixtures
 */
export const allMenuFixtures: MenuInput[] = [
  singleDayMenu,
  weekendMenu,
  weekMenu,
  twoWeekMenu,
  monthMenu,
  yearBoundaryMenu,
  leapYearMenu,
  sameDayMenu,
  futureMenu,
  unicodeMenu,
  specialCharsMenu,
  longDurationMenu,
];

/**
 * Sample menu assignment inputs for testing
 */
export function createSampleAssignments(
  recipeIds: string[],
  startDate: Date
): MenuAssignmentInput[] {
  if (recipeIds.length === 0) return [];

  const assignments: MenuAssignmentInput[] = [];
  const mealSlots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Create assignments for a week
  for (let day = 0; day < 7; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    // Add 2-3 meals per day
    const mealsPerDay = 2 + (day % 2);
    for (let meal = 0; meal < mealsPerDay; meal++) {
      const recipeIndex = (day * 3 + meal) % recipeIds.length;
      assignments.push({
        recipeId: recipeIds[recipeIndex]!,
        date: new Date(date),
        mealSlot: mealSlots[meal % mealSlots.length]!,
        servings: 2 + (meal % 3),
        cookDate: new Date(date),
        leftoverDurationDays: 3 + (day % 4),
      });
    }
  }

  return assignments;
}

/**
 * Create a full week of assignments with all meal slots
 */
export function createFullWeekAssignments(
  recipeIds: string[],
  startDate: Date
): MenuAssignmentInput[] {
  if (recipeIds.length === 0) return [];

  const assignments: MenuAssignmentInput[] = [];
  const mealSlots: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

  for (let day = 0; day < 7; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    for (let slotIndex = 0; slotIndex < mealSlots.length; slotIndex++) {
      const recipeIndex = (day * 3 + slotIndex) % recipeIds.length;
      assignments.push({
        recipeId: recipeIds[recipeIndex]!,
        date: new Date(date),
        mealSlot: mealSlots[slotIndex]!,
        servings: 4,
        cookDate: new Date(date),
      });
    }
  }

  return assignments;
}

/**
 * Create assignments with leftovers (cook once, eat multiple days)
 */
export function createLeftoverAssignments(
  recipeId: string,
  startDate: Date,
  leftoverDays: number
): MenuAssignmentInput[] {
  const assignments: MenuAssignmentInput[] = [];
  const cookDate = new Date(startDate);

  for (let day = 0; day <= leftoverDays; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    assignments.push({
      recipeId,
      date: new Date(date),
      mealSlot: day === 0 ? 'dinner' : 'lunch',
      servings: day === 0 ? 6 : 2,
      cookDate: new Date(cookDate),
      leftoverDurationDays: leftoverDays,
    });
  }

  return assignments;
}

/**
 * Menu configurations for different scenarios
 */
export const menuScenarios = {
  /** Simple single-person meal planning */
  singlePerson: {
    menu: weekMenu,
    servingsPerMeal: 1,
    mealsPerDay: 2,
  },
  /** Family of 4 meal planning */
  family: {
    menu: weekMenu,
    servingsPerMeal: 4,
    mealsPerDay: 3,
  },
  /** Meal prep for the week */
  mealPrep: {
    menu: weekMenu,
    servingsPerMeal: 8,
    mealsPerDay: 2,
    cookDaysPerWeek: 2,
  },
  /** Party planning */
  party: {
    menu: singleDayMenu,
    servingsPerMeal: 20,
    mealsPerDay: 4,
  },
};
