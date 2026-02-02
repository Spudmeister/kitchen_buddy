/**
 * Cook Session and Statistics Test Fixtures for Sous Chef
 * 
 * Sample cook sessions, ratings, and statistics data for testing.
 * Covers various time ranges and edge cases.
 * 
 * Requirements: Design - Testing Strategy
 */

import type { CookSessionInput, RatingInput } from '../../src/types/statistics.js';

/**
 * Helper to create a date relative to today
 */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date;
}

/**
 * Helper to create a specific date
 */
function createDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Create a cook session input for a recipe
 */
export function createCookSession(
  recipeId: string,
  options: {
    daysAgo?: number;
    date?: Date;
    prepMinutes?: number;
    cookMinutes?: number;
    servings?: number;
    notes?: string;
    instanceId?: string;
  } = {}
): CookSessionInput {
  return {
    recipeId,
    date: options.date ?? daysAgo(options.daysAgo ?? 0),
    actualPrepMinutes: options.prepMinutes,
    actualCookMinutes: options.cookMinutes,
    servingsMade: options.servings ?? 4,
    notes: options.notes,
    instanceId: options.instanceId,
  };
}

/**
 * Create multiple cook sessions for a recipe over time
 */
export function createSessionHistory(
  recipeId: string,
  count: number,
  options: {
    startDaysAgo?: number;
    intervalDays?: number;
    basePrepMinutes?: number;
    baseCookMinutes?: number;
    variance?: number;
  } = {}
): CookSessionInput[] {
  const {
    startDaysAgo = count * 7,
    intervalDays = 7,
    basePrepMinutes = 15,
    baseCookMinutes = 30,
    variance = 5,
  } = options;

  const sessions: CookSessionInput[] = [];

  for (let i = 0; i < count; i++) {
    const daysBack = startDaysAgo - i * intervalDays;
    const prepVariance = Math.floor(Math.random() * variance * 2) - variance;
    const cookVariance = Math.floor(Math.random() * variance * 2) - variance;

    sessions.push({
      recipeId,
      date: daysAgo(daysBack),
      actualPrepMinutes: Math.max(1, basePrepMinutes + prepVariance),
      actualCookMinutes: Math.max(1, baseCookMinutes + cookVariance),
      servingsMade: 2 + (i % 4),
      notes: i % 3 === 0 ? `Session ${i + 1} notes` : undefined,
    });
  }

  return sessions;
}

/**
 * Create a rating input
 */
export function createRating(recipeId: string, rating: number): RatingInput {
  return { recipeId, rating };
}

/**
 * Sample cook sessions for testing statistics
 */
export const sampleSessions = {
  /** Sessions with consistent times */
  consistent: (recipeId: string): CookSessionInput[] => [
    createCookSession(recipeId, { daysAgo: 30, prepMinutes: 15, cookMinutes: 30 }),
    createCookSession(recipeId, { daysAgo: 23, prepMinutes: 15, cookMinutes: 30 }),
    createCookSession(recipeId, { daysAgo: 16, prepMinutes: 15, cookMinutes: 30 }),
    createCookSession(recipeId, { daysAgo: 9, prepMinutes: 15, cookMinutes: 30 }),
    createCookSession(recipeId, { daysAgo: 2, prepMinutes: 15, cookMinutes: 30 }),
  ],

  /** Sessions with varying times */
  varying: (recipeId: string): CookSessionInput[] => [
    createCookSession(recipeId, { daysAgo: 60, prepMinutes: 10, cookMinutes: 25 }),
    createCookSession(recipeId, { daysAgo: 45, prepMinutes: 20, cookMinutes: 35 }),
    createCookSession(recipeId, { daysAgo: 30, prepMinutes: 12, cookMinutes: 28 }),
    createCookSession(recipeId, { daysAgo: 15, prepMinutes: 18, cookMinutes: 32 }),
    createCookSession(recipeId, { daysAgo: 1, prepMinutes: 15, cookMinutes: 30 }),
  ],

  /** Single session */
  single: (recipeId: string): CookSessionInput[] => [
    createCookSession(recipeId, { daysAgo: 7, prepMinutes: 20, cookMinutes: 40 }),
  ],

  /** Many sessions (for statistics accuracy) */
  many: (recipeId: string): CookSessionInput[] =>
    createSessionHistory(recipeId, 20, {
      startDaysAgo: 180,
      intervalDays: 9,
      basePrepMinutes: 15,
      baseCookMinutes: 30,
      variance: 8,
    }),

  /** Sessions without times (edge case) */
  noTimes: (recipeId: string): CookSessionInput[] => [
    createCookSession(recipeId, { daysAgo: 14, servings: 4 }),
    createCookSession(recipeId, { daysAgo: 7, servings: 2 }),
    createCookSession(recipeId, { daysAgo: 0, servings: 6 }),
  ],

  /** Sessions with notes */
  withNotes: (recipeId: string): CookSessionInput[] => [
    createCookSession(recipeId, {
      daysAgo: 21,
      prepMinutes: 15,
      cookMinutes: 30,
      notes: 'First attempt - turned out great!',
    }),
    createCookSession(recipeId, {
      daysAgo: 14,
      prepMinutes: 12,
      cookMinutes: 28,
      notes: 'Reduced salt this time',
    }),
    createCookSession(recipeId, {
      daysAgo: 7,
      prepMinutes: 10,
      cookMinutes: 25,
      notes: 'Getting faster at prep',
    }),
  ],
};

/**
 * Sample rating patterns for testing
 */
export const sampleRatings = {
  /** High rating (favorite) */
  favorite: (recipeId: string): RatingInput => createRating(recipeId, 5),

  /** Good rating */
  good: (recipeId: string): RatingInput => createRating(recipeId, 4),

  /** Average rating */
  average: (recipeId: string): RatingInput => createRating(recipeId, 3),

  /** Low rating */
  low: (recipeId: string): RatingInput => createRating(recipeId, 2),

  /** Poor rating */
  poor: (recipeId: string): RatingInput => createRating(recipeId, 1),
};

/**
 * Create year-in-review test data
 */
export function createYearData(
  recipeIds: string[],
  year: number
): {
  sessions: CookSessionInput[];
  ratings: RatingInput[];
} {
  const sessions: CookSessionInput[] = [];
  const ratings: RatingInput[] = [];

  if (recipeIds.length === 0) {
    return { sessions, ratings };
  }

  // Create sessions throughout the year
  for (let month = 0; month < 12; month++) {
    const sessionsThisMonth = 5 + (month % 4); // 5-8 sessions per month

    for (let i = 0; i < sessionsThisMonth; i++) {
      const day = 1 + Math.floor(Math.random() * 27);
      const recipeIndex = (month * sessionsThisMonth + i) % recipeIds.length;

      sessions.push({
        recipeId: recipeIds[recipeIndex]!,
        date: createDate(year, month + 1, day),
        actualPrepMinutes: 10 + Math.floor(Math.random() * 20),
        actualCookMinutes: 20 + Math.floor(Math.random() * 40),
        servingsMade: 2 + Math.floor(Math.random() * 4),
      });
    }
  }

  // Create ratings for some recipes
  const ratedRecipes = recipeIds.slice(0, Math.ceil(recipeIds.length * 0.7));
  for (const recipeId of ratedRecipes) {
    ratings.push({
      recipeId,
      rating: 3 + Math.floor(Math.random() * 3), // 3-5 stars
    });
  }

  return { sessions, ratings };
}

/**
 * Create streak test data (consecutive days of cooking)
 */
export function createStreakData(
  recipeIds: string[],
  streakLength: number,
  startDaysAgo: number
): CookSessionInput[] {
  if (recipeIds.length === 0) return [];

  const sessions: CookSessionInput[] = [];

  for (let i = 0; i < streakLength; i++) {
    sessions.push({
      recipeId: recipeIds[i % recipeIds.length]!,
      date: daysAgo(startDaysAgo - i),
      actualPrepMinutes: 15,
      actualCookMinutes: 30,
      servingsMade: 4,
    });
  }

  return sessions;
}

/**
 * Statistics test scenarios
 */
export const statisticsScenarios = {
  /** New user with no data */
  newUser: {
    sessions: [],
    ratings: [],
    expectedStats: {
      totalCookSessions: 0,
      uniqueRecipesCooked: 0,
    },
  },

  /** Active user with regular cooking */
  activeUser: {
    sessionsPerWeek: 5,
    uniqueRecipes: 15,
    avgRating: 4,
  },

  /** Casual user with occasional cooking */
  casualUser: {
    sessionsPerWeek: 1,
    uniqueRecipes: 5,
    avgRating: 3.5,
  },

  /** Power user with lots of data */
  powerUser: {
    sessionsPerWeek: 10,
    uniqueRecipes: 50,
    avgRating: 4.2,
  },
};

/**
 * Edge case sessions
 */
export const edgeCaseSessions = {
  /** Session at midnight */
  midnight: (recipeId: string): CookSessionInput => ({
    recipeId,
    date: new Date(new Date().setHours(0, 0, 0, 0)),
    actualPrepMinutes: 15,
    actualCookMinutes: 30,
    servingsMade: 4,
  }),

  /** Session at end of day */
  endOfDay: (recipeId: string): CookSessionInput => ({
    recipeId,
    date: new Date(new Date().setHours(23, 59, 59, 999)),
    actualPrepMinutes: 15,
    actualCookMinutes: 30,
    servingsMade: 4,
  }),

  /** Session with very long times */
  longTimes: (recipeId: string): CookSessionInput => ({
    recipeId,
    date: daysAgo(1),
    actualPrepMinutes: 480, // 8 hours
    actualCookMinutes: 720, // 12 hours
    servingsMade: 20,
    notes: 'All-day cooking project',
  }),

  /** Session with minimal times */
  minimalTimes: (recipeId: string): CookSessionInput => ({
    recipeId,
    date: daysAgo(1),
    actualPrepMinutes: 1,
    actualCookMinutes: 1,
    servingsMade: 1,
  }),

  /** Session with large servings */
  largeServings: (recipeId: string): CookSessionInput => ({
    recipeId,
    date: daysAgo(1),
    actualPrepMinutes: 60,
    actualCookMinutes: 120,
    servingsMade: 100,
    notes: 'Catering event',
  }),

  /** Session on leap day */
  leapDay: (recipeId: string): CookSessionInput => ({
    recipeId,
    date: createDate(2024, 2, 29),
    actualPrepMinutes: 15,
    actualCookMinutes: 30,
    servingsMade: 4,
  }),

  /** Session on year boundary */
  yearBoundary: (recipeId: string): CookSessionInput => ({
    recipeId,
    date: createDate(2025, 12, 31),
    actualPrepMinutes: 15,
    actualCookMinutes: 30,
    servingsMade: 4,
  }),
};
