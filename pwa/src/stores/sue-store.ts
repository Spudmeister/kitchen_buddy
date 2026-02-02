/**
 * Sue Store - State management for Menu Assistant (Sue)
 *
 * Manages conversation state, constraints, variety preferences,
 * and suggestion tracking for the AI-powered menu assistant.
 *
 * Requirements: 16.1, 16.4
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  SueChatMessage,
  RecipeSuggestion,
  MenuConstraints,
  VarietyPreferences,
} from '@/types/sue';
// MealSlot type is used in the interface but not directly imported

/**
 * Sue Store state interface
 */
interface SueState {
  // Conversation
  messages: SueChatMessage[];
  isTyping: boolean;

  // Context
  currentMenuId?: string;
  constraints: MenuConstraints;
  varietyPreferences: VarietyPreferences;

  // Tracking
  recentlySuggested: string[];
  acceptedSuggestions: string[];
  rejectedSuggestions: string[];

  // Actions
  addUserMessage: (content: string) => string;
  addAssistantMessage: (content: string, suggestions?: RecipeSuggestion[]) => string;
  setTyping: (isTyping: boolean) => void;
  setCurrentMenuId: (menuId: string | undefined) => void;
  setConstraints: (constraints: MenuConstraints) => void;
  updateConstraints: (updates: Partial<MenuConstraints>) => void;
  setVarietyPreferences: (preferences: VarietyPreferences) => void;
  updateVarietyPreferences: (updates: Partial<VarietyPreferences>) => void;
  trackSuggestion: (recipeId: string) => void;
  acceptSuggestion: (recipeId: string) => void;
  rejectSuggestion: (recipeId: string) => void;
  clearConversation: () => void;
  resetStore: () => void;
}

/**
 * Default constraints
 */
const defaultConstraints: MenuConstraints = {};

/**
 * Default variety preferences
 */
const defaultVarietyPreferences: VarietyPreferences = {
  preferNewCuisines: true,
  preferNewIngredients: true,
};

/**
 * Initial state
 */
const initialState = {
  messages: [] as SueChatMessage[],
  isTyping: false,
  currentMenuId: undefined,
  constraints: defaultConstraints,
  varietyPreferences: defaultVarietyPreferences,
  recentlySuggested: [] as string[],
  acceptedSuggestions: [] as string[],
  rejectedSuggestions: [] as string[],
};

/**
 * Sue Store
 */
export const useSueStore = create<SueState>()((set, get) => ({
  ...initialState,

  /**
   * Add a user message to the conversation
   */
  addUserMessage: (content: string) => {
    const id = uuidv4();
    const message: SueChatMessage = {
      id,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, message],
    }));

    return id;
  },

  /**
   * Add an assistant message to the conversation
   */
  addAssistantMessage: (content: string, suggestions?: RecipeSuggestion[]) => {
    const id = uuidv4();
    const message: SueChatMessage = {
      id,
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions,
    };

    set((state) => ({
      messages: [...state.messages, message],
    }));

    // Track suggested recipes
    if (suggestions) {
      for (const suggestion of suggestions) {
        get().trackSuggestion(suggestion.recipe.id);
      }
    }

    return id;
  },

  /**
   * Set typing indicator
   */
  setTyping: (isTyping: boolean) => {
    set({ isTyping });
  },

  /**
   * Set current menu ID
   */
  setCurrentMenuId: (menuId: string | undefined) => {
    set({ currentMenuId: menuId });
  },

  /**
   * Set constraints (replaces all)
   */
  setConstraints: (constraints: MenuConstraints) => {
    set({ constraints });
  },

  /**
   * Update constraints (merges with existing)
   */
  updateConstraints: (updates: Partial<MenuConstraints>) => {
    set((state) => ({
      constraints: { ...state.constraints, ...updates },
    }));
  },

  /**
   * Set variety preferences (replaces all)
   */
  setVarietyPreferences: (preferences: VarietyPreferences) => {
    set({ varietyPreferences: preferences });
  },

  /**
   * Update variety preferences (merges with existing)
   */
  updateVarietyPreferences: (updates: Partial<VarietyPreferences>) => {
    set((state) => ({
      varietyPreferences: { ...state.varietyPreferences, ...updates },
    }));
  },

  /**
   * Track a suggested recipe
   */
  trackSuggestion: (recipeId: string) => {
    set((state) => {
      if (state.recentlySuggested.includes(recipeId)) {
        return state;
      }
      return {
        recentlySuggested: [...state.recentlySuggested, recipeId],
      };
    });
  },

  /**
   * Mark a suggestion as accepted
   */
  acceptSuggestion: (recipeId: string) => {
    set((state) => {
      if (state.acceptedSuggestions.includes(recipeId)) {
        return state;
      }
      return {
        acceptedSuggestions: [...state.acceptedSuggestions, recipeId],
        // Remove from rejected if it was there
        rejectedSuggestions: state.rejectedSuggestions.filter((id) => id !== recipeId),
      };
    });
  },

  /**
   * Mark a suggestion as rejected
   */
  rejectSuggestion: (recipeId: string) => {
    set((state) => {
      if (state.rejectedSuggestions.includes(recipeId)) {
        return state;
      }
      return {
        rejectedSuggestions: [...state.rejectedSuggestions, recipeId],
        // Remove from accepted if it was there
        acceptedSuggestions: state.acceptedSuggestions.filter((id) => id !== recipeId),
      };
    });
  },

  /**
   * Clear conversation history
   */
  clearConversation: () => {
    set({
      messages: [],
      recentlySuggested: [],
    });
  },

  /**
   * Reset entire store to initial state
   */
  resetStore: () => {
    set(initialState);
  },
}));

/**
 * Selector for getting the latest suggestions
 */
export function useLatestSuggestions(): RecipeSuggestion[] {
  const messages = useSueStore((state) => state.messages);
  
  // Find the most recent assistant message with suggestions
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant' && message.suggestions && message.suggestions.length > 0) {
      return message.suggestions;
    }
  }
  
  return [];
}

/**
 * Selector for checking if a recipe was suggested
 */
export function useWasSuggested(recipeId: string): boolean {
  return useSueStore((state) => state.recentlySuggested.includes(recipeId));
}

/**
 * Selector for checking if a recipe was accepted
 */
export function useWasAccepted(recipeId: string): boolean {
  return useSueStore((state) => state.acceptedSuggestions.includes(recipeId));
}

/**
 * Selector for checking if a recipe was rejected
 */
export function useWasRejected(recipeId: string): boolean {
  return useSueStore((state) => state.rejectedSuggestions.includes(recipeId));
}
