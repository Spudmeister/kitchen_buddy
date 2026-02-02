import { ReactNode, useEffect, useCallback } from 'react';
import { NavigationShell } from './NavigationShell';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import { ToastContainer } from '../ui/ToastContainer';
import { UpdateAvailable } from '../ui/UpdateAvailable';
import { ModalContainer } from '../ui/ModalContainer';
import { SkipLinks } from '../ui/SkipLinks';
import { SKIP_LINK_TARGETS, matchesShortcut, KEYBOARD_SHORTCUTS } from '../../utils/accessibility';
import { useUIStore } from '../../stores/ui-store';

interface AppShellProps {
  children: ReactNode;
}

/**
 * App Shell - Root layout component
 * 
 * Provides:
 * - Skip links for keyboard navigation
 * - Navigation shell (bottom bar on mobile, sidebar on desktop)
 * - Toast notification system
 * - Modal container
 * - Offline indicator
 * - Update available notification
 * - Global keyboard shortcuts
 * 
 * Requirements: 1.1, 2.1, 32.1, 32.2
 */
export function AppShell({ children }: AppShellProps) {
  const { openModal } = useUIStore();

  // Global keyboard shortcuts
  const handleGlobalKeyDown = useCallback((event: KeyboardEvent) => {
    // Search shortcut (Cmd/Ctrl + K)
    if (matchesShortcut(event, KEYBOARD_SHORTCUTS.SEARCH)) {
      event.preventDefault();
      openModal('search');
    }
  }, [openModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      {/* Skip links for keyboard navigation - Requirements: 32.2 */}
      <SkipLinks />
      
      <OfflineIndicator />
      
      {/* Sidebar navigation for desktop */}
      <nav 
        className="hidden md:block"
        id={SKIP_LINK_TARGETS.NAVIGATION}
        aria-label="Main navigation"
      >
        <NavigationShell variant="sidebar" />
      </nav>
      
      {/* Main content area */}
      <main 
        id={SKIP_LINK_TARGETS.MAIN_CONTENT}
        className="flex-1 pb-16 md:pb-0 overflow-auto"
        role="main"
        aria-label="Main content"
      >
        {children}
      </main>
      
      {/* Bottom navigation for mobile */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40"
        aria-label="Main navigation"
      >
        <NavigationShell variant="bottom" />
      </nav>
      
      {/* Toast notifications - live region for screen readers */}
      <ToastContainer />
      
      {/* Modal container */}
      <ModalContainer />
      
      {/* Update available notification */}
      <UpdateAvailable />
    </div>
  );
}
