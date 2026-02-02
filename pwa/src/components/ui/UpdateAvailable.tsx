/**
 * Update Available Banner
 * Shows when a new version of the app is available
 * 
 * Requirements: 1.5 - Sync pending changes when online
 */

import { useServiceWorkerStatus } from '@hooks/useServiceWorkerStatus';
import { applyUpdate } from '@services/sw-registration';

export function UpdateAvailable() {
  const { updateAvailable } = useServiceWorkerStatus();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-emerald-600 text-white rounded-lg shadow-lg p-4 z-50 flex items-center justify-between gap-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        <span className="text-sm">A new version is available!</span>
      </div>
      <button
        onClick={applyUpdate}
        className="bg-white text-emerald-600 px-3 py-1 rounded text-sm font-medium hover:bg-emerald-50 transition-colors flex-shrink-0"
      >
        Update
      </button>
    </div>
  );
}
