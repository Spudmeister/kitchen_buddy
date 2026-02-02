import { useOnlineStatus } from '@hooks/useOnlineStatus';

/**
 * Offline indicator banner
 * Shows when the app is offline
 * 
 * Uses both color AND icon to indicate offline status (WCAG 32.5 compliance)
 * 
 * Requirements: 1.4, 32.5
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 bg-amber-600 dark:bg-amber-700 text-white text-center py-2 text-sm z-50 flex items-center justify-center gap-2 shadow-md"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Offline icon - provides non-color indication */}
      <svg 
        className="w-5 h-5 flex-shrink-0" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" 
        />
      </svg>
      <span className="font-medium">Offline</span>
      <span className="hidden sm:inline">— Changes will sync when you're back online.</span>
      <span className="sr-only">You are currently offline. Any changes you make will be saved locally and synchronized when your internet connection is restored.</span>
    </div>
  );
}
