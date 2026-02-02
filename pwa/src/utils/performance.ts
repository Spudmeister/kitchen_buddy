/**
 * Performance Utilities
 *
 * Provides utilities for measuring and optimizing app performance.
 * Helps achieve Lighthouse 90+ score and meet performance requirements.
 *
 * Requirements: 33.1, 33.2, 33.3, 33.4
 */

/**
 * Performance thresholds based on requirements
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Initial load should complete within 2 seconds on 3G (Requirement 33.2) */
  INITIAL_LOAD_MS: 2000,
  /** Search results should appear within 100ms (Requirement 33.3) */
  SEARCH_RESULTS_MS: 100,
  /** View transitions should complete within 300ms (Requirement 33.4) */
  VIEW_TRANSITION_MS: 300,
  /** Target Lighthouse performance score (Requirement 33.1) */
  LIGHTHOUSE_SCORE: 90,
};

/**
 * Measure execution time of an async function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  threshold?: number
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (process.env.NODE_ENV === 'development') {
    const status = threshold && duration > threshold ? '⚠️ SLOW' : '✓';
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms ${status}`);
  }

  return { result, duration };
}

/**
 * Measure execution time of a sync function
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  threshold?: number
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (process.env.NODE_ENV === 'development') {
    const status = threshold && duration > threshold ? '⚠️ SLOW' : '✓';
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms ${status}`);
  }

  return { result, duration };
}

/**
 * Debounce function for search and other frequent operations
 * Helps meet the 100ms search results requirement
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function for scroll and resize handlers
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback with fallback
 * Use for non-critical work that can be deferred
 */
export function requestIdleCallbackPolyfill(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  // Fallback for browsers without requestIdleCallback
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    });
  }, 1) as unknown as number;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallbackPolyfill(handle: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

/**
 * Preload a route component
 * Call this on hover/focus to preload the next likely route
 */
export function preloadRoute(importFn: () => Promise<unknown>): void {
  requestIdleCallbackPolyfill(() => {
    importFn().catch(() => {
      // Silently fail - preloading is optional
    });
  });
}

/**
 * Preload critical resources
 * Call this early in app lifecycle
 */
export function preloadCriticalResources(): void {
  // Preload SQL.js WASM file
  const wasmLink = document.createElement('link');
  wasmLink.rel = 'preload';
  wasmLink.as = 'fetch';
  wasmLink.href = '/sql-wasm/sql-wasm.wasm';
  wasmLink.crossOrigin = 'anonymous';
  document.head.appendChild(wasmLink);
}

/**
 * Report Web Vitals metrics
 * Useful for monitoring real-world performance
 */
export interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function reportWebVitals(onReport: (metric: WebVitalsMetric) => void): void {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Use PerformanceObserver for Core Web Vitals
  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (lastEntry) {
        const value = lastEntry.startTime;
        onReport({
          name: 'LCP',
          value,
          rating: value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor',
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      if (fcpEntry) {
        const value = fcpEntry.startTime;
        onReport({
          name: 'FCP',
          value,
          rating: value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor',
        });
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as Array<PerformanceEntry & { hadRecentInput: boolean; value: number }>) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      onReport({
        name: 'CLS',
        value: clsValue,
        rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor',
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Time to First Byte (TTFB)
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const value = navigationEntry.responseStart;
      onReport({
        name: 'TTFB',
        value,
        rating: value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor',
      });
    }
  } catch {
    // PerformanceObserver not supported
  }
}

/**
 * Check if the device has a slow connection
 */
export function isSlowConnection(): boolean {
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
  if (!connection) return false;
  
  return (
    connection.saveData === true ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
  );
}

/**
 * Check if the device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get optimal image quality based on connection
 */
export function getOptimalImageQuality(): 'low' | 'medium' | 'high' {
  if (isSlowConnection()) return 'low';
  
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  if (connection?.effectiveType === '3g') return 'medium';
  
  return 'high';
}

/**
 * Schedule work during idle time
 * Use for non-critical operations like analytics, prefetching
 */
export function scheduleIdleWork(tasks: Array<() => void>): void {
  let taskIndex = 0;

  function runNextTask(deadline: IdleDeadline): void {
    while (taskIndex < tasks.length && deadline.timeRemaining() > 0) {
      tasks[taskIndex]?.();
      taskIndex++;
    }

    if (taskIndex < tasks.length) {
      requestIdleCallbackPolyfill(runNextTask);
    }
  }

  requestIdleCallbackPolyfill(runNextTask);
}

/**
 * Create a performance mark for custom timing
 */
export function mark(name: string): void {
  if (process.env.NODE_ENV === 'development') {
    performance.mark(name);
  }
}

/**
 * Measure between two marks
 */
export function measureMarks(name: string, startMark: string, endMark: string): number | null {
  if (process.env.NODE_ENV === 'development') {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      const entry = entries[entries.length - 1];
      return entry?.duration ?? null;
    } catch {
      return null;
    }
  }
  return null;
}
