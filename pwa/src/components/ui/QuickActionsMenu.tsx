/**
 * Quick Actions Menu Component
 *
 * Provides contextual actions for recipes with responsive design:
 * - Desktop: Dropdown menu
 * - Mobile: Bottom sheet
 *
 * Requirements: 11.1, 11.2, 32.2
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PlayIcon,
  PlusIcon,
  ScaleIcon,
  ShareIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  XMarkIcon,
} from '../icons';
import { handleKeyboardNavigation } from '../../utils/accessibility';

/**
 * Quick action types available on recipe cards
 */
export type QuickActionType =
  | 'cook-now'
  | 'add-to-menu'
  | 'scale'
  | 'share'
  | 'edit'
  | 'duplicate'
  | 'delete';

/**
 * Action definition with icon and label
 */
interface ActionDefinition {
  type: QuickActionType;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
}

/**
 * All available quick actions
 */
export const QUICK_ACTIONS: ActionDefinition[] = [
  { type: 'cook-now', label: 'Cook Now', icon: <PlayIcon className="w-5 h-5" aria-hidden="true" /> },
  { type: 'add-to-menu', label: 'Add to Menu', icon: <PlusIcon className="w-5 h-5" aria-hidden="true" /> },
  { type: 'scale', label: 'Scale', icon: <ScaleIcon className="w-5 h-5" aria-hidden="true" /> },
  { type: 'share', label: 'Share', icon: <ShareIcon className="w-5 h-5" aria-hidden="true" /> },
  { type: 'edit', label: 'Edit', icon: <PencilIcon className="w-5 h-5" aria-hidden="true" /> },
  { type: 'duplicate', label: 'Duplicate', icon: <DocumentDuplicateIcon className="w-5 h-5" aria-hidden="true" /> },
  { type: 'delete', label: 'Delete', icon: <TrashIcon className="w-5 h-5" aria-hidden="true" />, destructive: true },
];

/**
 * Get action types as an array (useful for testing)
 */
export function getQuickActionTypes(): QuickActionType[] {
  return QUICK_ACTIONS.map((action) => action.type);
}

/**
 * Props for QuickActionsMenu
 */
export interface QuickActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: QuickActionType) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  recipeTitle?: string;
}

/**
 * Hook to detect if we're on mobile
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Desktop Dropdown Menu
 */
interface DropdownMenuProps {
  onClose: () => void;
  onAction: (action: QuickActionType) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

function DropdownMenu({ onClose, onAction, anchorRef }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        // Return focus to anchor
        anchorRef?.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, anchorRef]);

  // Focus first item on mount
  useEffect(() => {
    const buttons = menuRef.current?.querySelectorAll('button');
    buttons?.[0]?.focus();
  }, []);

  const handleAction = useCallback(
    (action: QuickActionType) => {
      onAction(action);
      onClose();
    },
    [onAction, onClose]
  );

  // Keyboard navigation for menu items
  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const buttons = menuRef.current?.querySelectorAll('button');
      if (!buttons) return;

      handleKeyboardNavigation(event, {
        onArrowDown: () => {
          const nextIndex = (focusedIndex + 1) % buttons.length;
          setFocusedIndex(nextIndex);
          (buttons[nextIndex] as HTMLElement)?.focus();
        },
        onArrowUp: () => {
          const prevIndex = focusedIndex <= 0 ? buttons.length - 1 : focusedIndex - 1;
          setFocusedIndex(prevIndex);
          (buttons[prevIndex] as HTMLElement)?.focus();
        },
        onHome: () => {
          setFocusedIndex(0);
          (buttons[0] as HTMLElement)?.focus();
        },
        onEnd: () => {
          const lastIndex = buttons.length - 1;
          setFocusedIndex(lastIndex);
          (buttons[lastIndex] as HTMLElement)?.focus();
        },
      });
    },
    [focusedIndex]
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Recipe quick actions"
      onKeyDown={handleMenuKeyDown}
      className="absolute right-0 top-full mt-1 z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {QUICK_ACTIONS.map((action, index) => (
        <button
          key={action.type}
          role="menuitem"
          tabIndex={index === focusedIndex ? 0 : -1}
          onClick={() => handleAction(action.type)}
          onFocus={() => setFocusedIndex(index)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
            action.destructive
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}


/**
 * Mobile Bottom Sheet
 */
interface BottomSheetProps {
  onClose: () => void;
  onAction: (action: QuickActionType) => void;
  recipeTitle?: string;
}

function BottomSheet({ onClose, onAction, recipeTitle }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Prevent body scroll when sheet is open
    document.body.style.overflow = 'hidden';
    // Focus the close button for accessibility
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    // Focus trap
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !sheetRef.current) return;

      const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

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

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
    };
  }, [onClose]);

  const handleAction = useCallback(
    (action: QuickActionType) => {
      onAction(action);
      onClose();
    },
    [onAction, onClose]
  );

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-actions-title"
    >
      <div
        ref={sheetRef}
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 
            id="quick-actions-title"
            className="text-lg font-semibold text-gray-900 dark:text-white truncate"
          >
            {recipeTitle || 'Recipe Actions'}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        <div className="py-2 max-h-[60vh] overflow-y-auto" role="menu">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.type}
              role="menuitem"
              onClick={() => handleAction(action.type)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 text-left transition-colors active:bg-gray-100 dark:active:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
                action.destructive
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {action.icon}
              <span className="text-base font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>,
    document.body
  );
}

/**
 * Quick Actions Menu Component
 *
 * Renders as dropdown on desktop, bottom sheet on mobile.
 * Provides consistent actions across all recipe views.
 * Supports full keyboard navigation.
 */
export function QuickActionsMenu({
  isOpen,
  onClose,
  onAction,
  anchorRef,
  recipeTitle,
}: QuickActionsMenuProps) {
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <BottomSheet
        onClose={onClose}
        onAction={onAction}
        recipeTitle={recipeTitle}
      />
    );
  }

  return (
    <DropdownMenu
      onClose={onClose}
      onAction={onAction}
      anchorRef={anchorRef}
    />
  );
}
