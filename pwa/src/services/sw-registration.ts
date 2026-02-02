/**
 * Service Worker Registration and Offline Detection
 * 
 * Provides utilities for registering the service worker and detecting offline status.
 * Uses Workbox window for service worker lifecycle management.
 * 
 * Requirements: 1.3, 1.4
 */

import { registerSW } from 'virtual:pwa-register';

export interface ServiceWorkerStatus {
  isRegistered: boolean;
  isOffline: boolean;
  needsRefresh: boolean;
  updateAvailable: boolean;
}

type StatusChangeCallback = (status: ServiceWorkerStatus) => void;

let currentStatus: ServiceWorkerStatus = {
  isRegistered: false,
  isOffline: !navigator.onLine,
  needsRefresh: false,
  updateAvailable: false,
};

const statusListeners: Set<StatusChangeCallback> = new Set();

/**
 * Notify all listeners of status change
 */
function notifyStatusChange(): void {
  statusListeners.forEach((callback) => callback({ ...currentStatus }));
}

/**
 * Update status and notify listeners
 */
function updateStatus(updates: Partial<ServiceWorkerStatus>): void {
  currentStatus = { ...currentStatus, ...updates };
  notifyStatusChange();
}

/**
 * Register the service worker with update handling
 */
export function initializeServiceWorker(): () => void {
  // Set up online/offline detection
  const handleOnline = () => updateStatus({ isOffline: false });
  const handleOffline = () => updateStatus({ isOffline: true });

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Register service worker with Workbox
  // The returned function can be used to trigger updates
  registerSW({
    immediate: true,
    onRegistered(registration) {
      updateStatus({ isRegistered: true });
      
      // Check for updates periodically (every hour)
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
      updateStatus({ isRegistered: false });
    },
    onNeedRefresh() {
      updateStatus({ needsRefresh: true, updateAvailable: true });
    },
    onOfflineReady() {
      updateStatus({ isRegistered: true });
      console.log('App ready to work offline');
    },
  });

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Subscribe to service worker status changes
 */
export function subscribeToStatus(callback: StatusChangeCallback): () => void {
  statusListeners.add(callback);
  // Immediately call with current status
  callback({ ...currentStatus });
  
  return () => {
    statusListeners.delete(callback);
  };
}

/**
 * Get current service worker status
 */
export function getServiceWorkerStatus(): ServiceWorkerStatus {
  return { ...currentStatus };
}

/**
 * Check if the app is currently offline
 */
export function isOffline(): boolean {
  return currentStatus.isOffline;
}

/**
 * Check if a service worker update is available
 */
export function hasUpdate(): boolean {
  return currentStatus.updateAvailable;
}

/**
 * Trigger app refresh to apply service worker update
 */
export function applyUpdate(): void {
  if (currentStatus.needsRefresh) {
    window.location.reload();
  }
}
