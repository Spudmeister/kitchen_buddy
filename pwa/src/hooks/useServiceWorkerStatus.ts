/**
 * Hook to track service worker status
 * 
 * Provides reactive access to service worker registration status,
 * offline state, and update availability.
 * 
 * Requirements: 1.3, 1.4
 */

import { useState, useEffect } from 'react';
import { 
  subscribeToStatus, 
  getServiceWorkerStatus,
  type ServiceWorkerStatus 
} from '@services/sw-registration';

/**
 * Hook to track service worker status
 * 
 * @returns Current service worker status including offline state and update availability
 */
export function useServiceWorkerStatus(): ServiceWorkerStatus {
  const [status, setStatus] = useState<ServiceWorkerStatus>(getServiceWorkerStatus);

  useEffect(() => {
    const unsubscribe = subscribeToStatus(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
