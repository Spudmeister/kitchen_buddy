/**
 * Menu Assistant (Sue) types for Sous Chef
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 */

import type { Recipe } from './recipe.js';
import type { Menu, MealSlot } from './menu.js';

/**
 * A message in the Menu Assistant conversation
 */
export interface ChatMessage {
  /** Unique identifier */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** Message content */
  content: string;
  /** When the message was sent */
  timestamp: Date;
  /** Recipe suggestions included in this message (for assistant messages) */
  suggestions?: RecipeSuggestion[];
}

/**
 * A recipe suggestion from the Menu Assistant
 */
export interface RecipeSuggestion {
  /** The suggested recipe */
  recipe: Recipe;
  /** Reason for the suggestion */
  reason: string;
  /** Suggested date for the recipe (if applicable) */
  suggestedDate?: Date;
  /** Suggested meal slot */
  suggestedMealSlot?: MealSlot;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Constraints for menu suggestions
 * Requirements: 16.3 - Filter by dietary restrictions, time, ingredients
 */
export interface MenuConstraints {
  /** Dietary restrictions to respect */
  dietaryRestrictions?: string[];
  /** Maximum prep time in minutes */
  maxPrepTime?: number;
  /** Maximum cook time in minutes */
  maxCookTime?: number;
  /** Maximum total time in minutes */
  maxTotalTime?: number;
  /** Available ingredients ("What can I make with...") */
  availableIngredients?: string[];
  /** Ingredients to exclude */
  excludeIngredients?: string[];
  /** Tags to include */
  includeTags?: string[];
  /** Tags to exclude */
  excludeTags?: string[];
  /** Minimum rating */
  minRating?: number;
  /** Target servings */
  servings?: number;
}

/**
 * Variety preferences for menu suggestions
 * Requirements: 16.4 - Avoid repeating cuisines/ingredients
 */
export interface VarietyPreferences {
  /** Avoid repeating these cuisines */
  avoidCuisines?: string[];
  /** Avoid repeating these main ingredients */
  avoidMainIngredients?: string[];
  /** Minimum days between repeating the same recipe */
  minDaysBetweenRepeats?: number;
}

/**
 * Context for the Menu Assistant conversation
 */
export interface MenuAssistantContext {
  /** Current menu being built */
  currentMenu?: Menu;
  /** Constraints for suggestions */
  constraints?: MenuConstraints;
  /** Variety preferences */
  varietyPreferences?: VarietyPreferences;
  /** Conversation history */
  conversationHistory: ChatMessage[];
  /** Recently suggested recipes (to avoid repeating) */
  recentlySuggested: string[];
}

/**
 * Result of accepting a suggestion
 * Requirements: 16.5 - Add suggested recipes to menu
 */
export interface SuggestionAcceptResult {
  /** Whether the suggestion was accepted successfully */
  success: boolean;
  /** The menu assignment ID if successful */
  assignmentId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Response from the Menu Assistant
 */
export interface MenuAssistantResponse {
  /** The assistant's message */
  message: string;
  /** Recipe suggestions (if any) */
  suggestions: RecipeSuggestion[];
  /** Whether the assistant is asking for clarification */
  needsClarification: boolean;
  /** Suggested follow-up questions */
  followUpQuestions?: string[];
}
