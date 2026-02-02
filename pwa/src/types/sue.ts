/**
 * Sue (Menu Assistant) types for Sous Chef PWA
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 */

import type { Recipe } from './recipe';
import type { MealSlot } from './menu';

/**
 * A message in the Sue conversation
 */
export interface SueChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: RecipeSuggestion[];
}

/**
 * A recipe suggestion from Sue
 */
export interface RecipeSuggestion {
  recipe: Recipe;
  reason: string;
  confidence: number;
  suggestedDate?: Date;
  suggestedMealSlot?: MealSlot;
}

/**
 * Constraints for menu suggestions
 * Requirements: 16.3, 16.5 - Filter by dietary restrictions, time, ingredients
 */
export interface MenuConstraints {
  dietaryRestrictions?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  maxTotalTime?: number;
  availableIngredients?: string[];
  excludeIngredients?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  minRating?: number;
  servings?: number;
}

/**
 * Variety preferences for menu suggestions
 * Requirements: 16.4 - Avoid repeating cuisines/ingredients
 */
export interface VarietyPreferences {
  avoidCuisines?: string[];
  avoidMainIngredients?: string[];
  preferNewCuisines?: boolean;
  preferNewIngredients?: boolean;
}

/**
 * Result of accepting a suggestion
 */
export interface SuggestionAcceptResult {
  success: boolean;
  assignmentId?: string;
  error?: string;
}

/**
 * Response from Sue
 */
export interface SueResponse {
  message: string;
  suggestions: RecipeSuggestion[];
  needsClarification: boolean;
  followUpQuestions?: string[];
}

/**
 * Quick prompt for Sue
 */
export interface SueQuickPrompt {
  id: string;
  text: string;
  category: 'general' | 'dietary' | 'time' | 'variety';
}
