/**
 * Lazy Image Component
 *
 * Provides lazy loading for images with intersection observer.
 * Supports placeholder, loading states, and error handling.
 *
 * Requirements: 33.5
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface LazyImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Optional placeholder to show while loading */
  placeholder?: React.ReactNode;
  /** Optional class name for the image */
  className?: string;
  /** Optional class name for the container */
  containerClassName?: string;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Root margin for intersection observer (default: 200px) */
  rootMargin?: string;
  /** Whether to use native lazy loading as fallback */
  useNativeLazy?: boolean;
}

/**
 * Default placeholder component
 */
function DefaultPlaceholder() {
  return (
    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
      <span className="text-gray-400 dark:text-gray-500 text-2xl">🍽️</span>
    </div>
  );
}

/**
 * Error placeholder component
 */
function ErrorPlaceholder() {
  return (
    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
      <span className="text-gray-400 dark:text-gray-500 text-2xl">⚠️</span>
    </div>
  );
}

/**
 * LazyImage Component
 *
 * Uses Intersection Observer to defer loading images until they're
 * about to enter the viewport. Falls back to native lazy loading
 * if Intersection Observer is not supported.
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  className = '',
  containerClassName = '',
  onLoad,
  onError,
  rootMargin = '200px',
  useNativeLazy = true,
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${containerClassName}`}>
      {/* Show placeholder while not in view or loading */}
      {(!isInView || (!isLoaded && !hasError)) && (
        <div className="absolute inset-0">
          {placeholder || <DefaultPlaceholder />}
        </div>
      )}

      {/* Show error state */}
      {hasError && (
        <div className="absolute inset-0">
          <ErrorPlaceholder />
        </div>
      )}

      {/* Render image when in view */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={handleLoad}
          onError={handleError}
          loading={useNativeLazy ? 'lazy' : undefined}
          decoding="async"
        />
      )}
    </div>
  );
}

/**
 * Hook for lazy loading images with Intersection Observer
 */
export function useLazyImage(rootMargin = '200px') {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  return { ref, isInView };
}
