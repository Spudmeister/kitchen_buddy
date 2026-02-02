/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcut handling for the application.
 * Supports global shortcuts and component-specific shortcuts.
 *
 * Requirements: 32.2
 */

import { useEffect, useCallback, useRef } from 'react';
import { matchesShortcut, KEYBOARD_SHORTCUTS } from '../utils/accessibility';

/**
 * Shortcut definition
 */
export interface ShortcutDefinition {
  key: string;
  modifier: 'meta' | 'ctrl' | 'alt' | 'shift' | null;
  description: string;
  action: () => void;
  /** Whether the shortcut should work when an input is focused */
  allowInInput?: boolean;
}

/**
 * Check if the active element is an input
 */
function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    (activeElement as HTMLElement).isContentEditable
  );
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const inputFocused = isInputFocused();

    for (const shortcut of shortcutsRef.current) {
      if (matchesShortcut(event, { key: shortcut.key, modifier: shortcut.modifier })) {
        // Skip if input is focused and shortcut doesn't allow it
        if (inputFocused && !shortcut.allowInInput) {
          continue;
        }

        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for focus management within a container
 */
export function useFocusManagement(containerRef: React.RefObject<HTMLElement>) {
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      )
    );
  }, [containerRef]);

  const focusFirst = useCallback(() => {
    const elements = getFocusableElements();
    elements[0]?.focus();
  }, [getFocusableElements]);

  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    elements[elements.length - 1]?.focus();
  }, [getFocusableElements]);

  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    const currentIndex = elements.findIndex((el) => el === document.activeElement);
    const nextIndex = (currentIndex + 1) % elements.length;
    elements[nextIndex]?.focus();
  }, [getFocusableElements]);

  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    const currentIndex = elements.findIndex((el) => el === document.activeElement);
    const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
    elements[prevIndex]?.focus();
  }, [getFocusableElements]);

  return {
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    getFocusableElements,
  };
}

/**
 * Hook for arrow key navigation in lists
 */
export function useArrowKeyNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    onSelect?: (element: HTMLElement) => void;
  } = {}
) {
  const { orientation = 'vertical', wrap = true, onSelect } = options;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!containerRef.current) return;

      const focusableElements = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"]):not([disabled])'
        )
      );

      const currentIndex = focusableElements.findIndex(
        (el) => el === document.activeElement
      );

      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault();
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) {
              nextIndex = wrap ? focusableElements.length - 1 : 0;
            }
          }
          break;
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            event.preventDefault();
            nextIndex = currentIndex + 1;
            if (nextIndex >= focusableElements.length) {
              nextIndex = wrap ? 0 : focusableElements.length - 1;
            }
          }
          break;
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault();
            nextIndex = currentIndex - 1;
            if (nextIndex < 0) {
              nextIndex = wrap ? focusableElements.length - 1 : 0;
            }
          }
          break;
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            event.preventDefault();
            nextIndex = currentIndex + 1;
            if (nextIndex >= focusableElements.length) {
              nextIndex = wrap ? 0 : focusableElements.length - 1;
            }
          }
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = focusableElements.length - 1;
          break;
        case 'Enter':
        case ' ':
          if (onSelect && document.activeElement instanceof HTMLElement) {
            event.preventDefault();
            onSelect(document.activeElement);
          }
          return;
        default:
          return;
      }

      focusableElements[nextIndex]?.focus();
    },
    [containerRef, orientation, wrap, onSelect]
  );

  return { handleKeyDown };
}

/**
 * Predefined keyboard shortcuts for the application
 */
export const APP_SHORTCUTS = {
  SEARCH: {
    key: KEYBOARD_SHORTCUTS.SEARCH.key,
    modifier: KEYBOARD_SHORTCUTS.SEARCH.modifier,
    description: 'Open search',
  },
  CLOSE: {
    key: KEYBOARD_SHORTCUTS.CLOSE.key,
    modifier: KEYBOARD_SHORTCUTS.CLOSE.modifier,
    description: 'Close modal or menu',
  },
} as const;
