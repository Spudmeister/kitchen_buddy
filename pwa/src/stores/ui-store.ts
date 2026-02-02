/**
 * UI Store - Global UI state management with Zustand
 * 
 * Manages:
 * - Navigation state
 * - Modal state
 * - Toast notifications
 * - User preferences
 * 
 * Requirements: 1.4, 30.5
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UnitSystem } from '@app-types/units';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Modal types
 */
export type ModalType =
  | 'recipe-picker'
  | 'date-picker'
  | 'confirm-delete'
  | 'settings'
  | 'search'
  | null;

/**
 * User preferences
 */
export interface UserPreferences {
  unitSystem: UnitSystem;
  defaultServings: number;
  leftoverDurationDays: number;
  theme: 'light' | 'dark' | 'system';
  textSize: 'small' | 'medium' | 'large';
}

/**
 * UI Store state
 */
interface UIState {
  // Navigation
  activeTab: 'plan' | 'shop' | 'cook';
  
  // Modals
  activeModal: ModalType;
  modalProps: Record<string, unknown>;
  
  // Toasts
  toasts: Toast[];
  
  // Search
  searchQuery: string;
  searchOpen: boolean;
  
  // Preferences
  preferences: UserPreferences;
  
  // Actions
  setActiveTab: (tab: UIState['activeTab']) => void;
  openModal: (type: ModalType, props?: Record<string, unknown>) => void;
  closeModal: () => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

/**
 * Default preferences
 */
const defaultPreferences: UserPreferences = {
  unitSystem: 'us',
  defaultServings: 4,
  leftoverDurationDays: 3,
  theme: 'system',
  textSize: 'medium',
};

/**
 * Generate unique toast ID
 */
let toastIdCounter = 0;
const generateToastId = () => `toast-${++toastIdCounter}`;

/**
 * UI Store
 */
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeTab: 'plan',
      activeModal: null,
      modalProps: {},
      toasts: [],
      searchQuery: '',
      searchOpen: false,
      preferences: defaultPreferences,

      // Actions
      setActiveTab: (tab) => set({ activeTab: tab }),

      openModal: (type, props = {}) =>
        set({ activeModal: type, modalProps: props }),

      closeModal: () => set({ activeModal: null, modalProps: {} }),

      showToast: (toast) => {
        const id = generateToastId();
        const newToast: Toast = { ...toast, id };
        
        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-dismiss after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().dismissToast(id);
          }, duration);
        }
      },

      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSearchOpen: (open) => set({ searchOpen: open }),

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
    }),
    {
      name: 'sous-chef-ui',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);
