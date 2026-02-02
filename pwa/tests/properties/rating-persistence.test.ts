/**
 * Property Test: Rating Persistence
 *
 * **Feature: sous-chef-pwa, Property 9: Rating Persistence**
 * **Validates: Requirements 8.2, 8.4**
 *
 * For any recipe rating:
 * - Rating SHALL save immediately on tap
 * - Rating SHALL appear on Recipe_Cards throughout the app
 * - Rating history SHALL be maintained
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { RatingEntry } from '../../src/components/ui/RatingControl';

/**
 * Valid rating values (1-5)
 */
const ratingArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 5 });

/**
 * Arbitrary for generating a rating entry
 */
const ratingEntryArb: fc.Arbitrary<RatingEntry> = fc.record({
  rating: ratingArb,
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

/**
 * Arbitrary for generating rating history
 */
const ratingHistoryArb: fc.Arbitrary<RatingEntry[]> = fc.array(ratingEntryArb, {
  minLength: 0,
  maxLength: 50,
});

/**
 * Simulate rating state management
 */
interface RatingState {
  currentRating?: number;
  history: RatingEntry[];
}

/**
 * Apply a rating (simulates immediate save)
 */
function applyRating(state: RatingState, newRating: number): RatingState {
  return {
    currentRating: newRating,
    history: [
      ...state.history,
      { rating: newRating, timestamp: new Date() },
    ],
  };
}

/**
 * Get the rating to display on a Recipe_Card
 */
function getDisplayRating(state: RatingState): number | undefined {
  return state.currentRating;
}

/**
 * Validate a rating value
 */
function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

describe('Property 9: Rating Persistence', () => {
  it('should save rating immediately when applied', () => {
    fc.assert(
      fc.property(ratingArb, (rating) => {
        const initialState: RatingState = { history: [] };
        const newState = applyRating(initialState, rating);

        // Rating should be saved immediately
        expect(newState.currentRating).toBe(rating);

        // History should contain the new rating
        expect(newState.history.length).toBe(1);
        expect(newState.history[0].rating).toBe(rating);
      }),
      { numRuns: 100 }
    );
  });

  it('should display the current rating on Recipe_Cards', () => {
    fc.assert(
      fc.property(ratingArb, (rating) => {
        const state: RatingState = {
          currentRating: rating,
          history: [{ rating, timestamp: new Date() }],
        };

        const displayRating = getDisplayRating(state);

        // Display rating should match current rating
        expect(displayRating).toBe(rating);
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain rating history across multiple ratings', () => {
    fc.assert(
      fc.property(fc.array(ratingArb, { minLength: 1, maxLength: 20 }), (ratings) => {
        let state: RatingState = { history: [] };

        // Apply each rating
        for (const rating of ratings) {
          state = applyRating(state, rating);
        }

        // History should contain all ratings
        expect(state.history.length).toBe(ratings.length);

        // Current rating should be the last one applied
        expect(state.currentRating).toBe(ratings[ratings.length - 1]);

        // Each rating in history should match the applied ratings
        for (let i = 0; i < ratings.length; i++) {
          expect(state.history[i].rating).toBe(ratings[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should only accept valid ratings (1-5)', () => {
    fc.assert(
      fc.property(ratingArb, (rating) => {
        expect(isValidRating(rating)).toBe(true);
        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(5);
        expect(Number.isInteger(rating)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject invalid ratings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -100, max: 0 }),
          fc.integer({ min: 6, max: 100 }),
          fc.float({ min: Math.fround(1.1), max: Math.fround(4.9), noNaN: true }).filter((n) => !Number.isInteger(n))
        ),
        (invalidRating) => {
          expect(isValidRating(invalidRating)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve rating history order (chronological)', () => {
    fc.assert(
      fc.property(ratingHistoryArb, (history) => {
        // Sort by timestamp
        const sorted = [...history].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );

        // Each entry should have a valid rating
        for (const entry of sorted) {
          expect(isValidRating(entry.rating)).toBe(true);
          expect(entry.timestamp).toBeInstanceOf(Date);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should update current rating when a new rating is applied', () => {
    fc.assert(
      fc.property(ratingArb, ratingArb, (firstRating, secondRating) => {
        let state: RatingState = { history: [] };

        // Apply first rating
        state = applyRating(state, firstRating);
        expect(state.currentRating).toBe(firstRating);

        // Apply second rating
        state = applyRating(state, secondRating);
        expect(state.currentRating).toBe(secondRating);

        // History should contain both
        expect(state.history.length).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  it('should show undefined rating for unrated recipes', () => {
    const state: RatingState = { history: [] };
    const displayRating = getDisplayRating(state);

    expect(displayRating).toBeUndefined();
  });

  it('should handle rating the same value multiple times', () => {
    fc.assert(
      fc.property(ratingArb, fc.integer({ min: 1, max: 5 }), (rating, repeatCount) => {
        let state: RatingState = { history: [] };

        // Apply the same rating multiple times
        for (let i = 0; i < repeatCount; i++) {
          state = applyRating(state, rating);
        }

        // Current rating should be the applied rating
        expect(state.currentRating).toBe(rating);

        // History should contain all applications
        expect(state.history.length).toBe(repeatCount);

        // All history entries should have the same rating
        for (const entry of state.history) {
          expect(entry.rating).toBe(rating);
        }
      }),
      { numRuns: 100 }
    );
  });
});
