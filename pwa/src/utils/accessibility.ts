/**
 * Accessibility Utilities
 *
 * Provides helper functions and constants for accessibility compliance.
 * Supports WCAG AA standards and screen reader compatibility.
 *
 * Requirements: 32.1, 32.2, 32.3, 32.4, 32.5
 */

/**
 * Keyboard key codes for navigation
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Common keyboard shortcuts for the application
 */
export const KEYBOARD_SHORTCUTS = {
  SEARCH: { key: 'k', modifier: 'meta' },
  CLOSE: { key: 'Escape', modifier: null },
  SAVE: { key: 's', modifier: 'meta' },
  NEW_RECIPE: { key: 'n', modifier: 'meta' },
} as const;

/**
 * Check if a keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: { key: string; modifier: 'meta' | 'ctrl' | 'alt' | 'shift' | null }
): boolean {
  const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
  
  if (!shortcut.modifier) {
    return keyMatches && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
  }
  
  switch (shortcut.modifier) {
    case 'meta':
      return keyMatches && (event.metaKey || event.ctrlKey);
    case 'ctrl':
      return keyMatches && event.ctrlKey;
    case 'alt':
      return keyMatches && event.altKey;
    case 'shift':
      return keyMatches && event.shiftKey;
    default:
      return false;
  }
}

/**
 * Handle keyboard navigation for interactive elements
 */
export function handleKeyboardNavigation(
  event: React.KeyboardEvent,
  options: {
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onHome?: () => void;
    onEnd?: () => void;
  }
): void {
  switch (event.key) {
    case KEYS.ENTER:
      if (options.onEnter) {
        event.preventDefault();
        options.onEnter();
      }
      break;
    case KEYS.SPACE:
      if (options.onSpace) {
        event.preventDefault();
        options.onSpace();
      }
      break;
    case KEYS.ESCAPE:
      if (options.onEscape) {
        event.preventDefault();
        options.onEscape();
      }
      break;
    case KEYS.ARROW_UP:
      if (options.onArrowUp) {
        event.preventDefault();
        options.onArrowUp();
      }
      break;
    case KEYS.ARROW_DOWN:
      if (options.onArrowDown) {
        event.preventDefault();
        options.onArrowDown();
      }
      break;
    case KEYS.ARROW_LEFT:
      if (options.onArrowLeft) {
        event.preventDefault();
        options.onArrowLeft();
      }
      break;
    case KEYS.ARROW_RIGHT:
      if (options.onArrowRight) {
        event.preventDefault();
        options.onArrowRight();
      }
      break;
    case KEYS.HOME:
      if (options.onHome) {
        event.preventDefault();
        options.onHome();
      }
      break;
    case KEYS.END:
      if (options.onEnd) {
        event.preventDefault();
        options.onEnd();
      }
      break;
  }
}

/**
 * Generate a unique ID for accessibility purposes
 */
let idCounter = 0;
export function generateAccessibleId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Format duration for screen readers
 */
export function formatDurationForScreenReader(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourStr = `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (mins === 0) {
    return hourStr;
  }
  return `${hourStr} and ${mins} minute${mins !== 1 ? 's' : ''}`;
}

/**
 * Format rating for screen readers
 */
export function formatRatingForScreenReader(rating: number | undefined): string {
  if (rating === undefined) {
    return 'Not rated';
  }
  return `${rating} out of 5 stars`;
}

/**
 * Announce a message to screen readers using a live region
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement is made
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus trap for modals and dialogs
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== KEYS.TAB) return;
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Skip link target IDs
 */
export const SKIP_LINK_TARGETS = {
  MAIN_CONTENT: 'main-content',
  NAVIGATION: 'main-navigation',
  SEARCH: 'search-input',
} as const;
