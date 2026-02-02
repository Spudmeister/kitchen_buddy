/**
 * Virtualized List Component
 *
 * Provides efficient rendering for large lists by only rendering
 * items that are visible in the viewport plus a buffer.
 *
 * Requirements: 33.6
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';

export interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each item in pixels (or function for variable heights) */
  itemHeight: number | ((item: T, index: number) => number);
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Number of items to render above/below viewport (default: 5) */
  overscan?: number;
  /** Optional class name for the container */
  className?: string;
  /** Optional class name for the inner container */
  innerClassName?: string;
  /** Key extractor function */
  keyExtractor: (item: T, index: number) => string;
  /** Callback when scrolling near the end */
  onEndReached?: () => void;
  /** Threshold for triggering onEndReached (default: 0.8) */
  endReachedThreshold?: number;
  /** Whether more items are being loaded */
  isLoading?: boolean;
  /** Loading indicator component */
  loadingComponent?: ReactNode;
  /** Empty state component */
  emptyComponent?: ReactNode;
  /** Gap between items in pixels */
  gap?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

/**
 * Calculate visible items based on scroll position
 */
function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeights: number[],
  overscan: number
): { start: number; end: number } {
  let start = 0;
  let accumulatedHeight = 0;

  // Find start index
  for (let i = 0; i < itemHeights.length; i++) {
    if (accumulatedHeight + itemHeights[i] > scrollTop) {
      start = Math.max(0, i - overscan);
      break;
    }
    accumulatedHeight += itemHeights[i];
  }

  // Find end index
  let end = start;
  accumulatedHeight = 0;
  for (let i = start; i < itemHeights.length; i++) {
    accumulatedHeight += itemHeights[i];
    end = i;
    if (accumulatedHeight > containerHeight + (overscan * (itemHeights[i] || 50))) {
      end = Math.min(itemHeights.length - 1, i + overscan);
      break;
    }
  }

  return { start, end: Math.min(end + 1, itemHeights.length) };
}

/**
 * VirtualizedList Component
 *
 * Efficiently renders large lists by only mounting items that are
 * visible in the viewport. Uses absolute positioning for items.
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  innerClassName = '',
  keyExtractor,
  onEndReached,
  endReachedThreshold = 0.8,
  isLoading = false,
  loadingComponent,
  emptyComponent,
  gap = 0,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const hasCalledEndReached = useRef(false);

  // Calculate item heights
  const itemHeights = useMemo(() => {
    return items.map((item, index) => {
      const height = typeof itemHeight === 'function' ? itemHeight(item, index) : itemHeight;
      return height + (index < items.length - 1 ? gap : 0);
    });
  }, [items, itemHeight, gap]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return itemHeights.reduce((sum, h) => sum + h, 0);
  }, [itemHeights]);

  // Calculate item positions
  const itemPositions = useMemo(() => {
    const positions: number[] = [];
    let currentPosition = 0;
    for (const height of itemHeights) {
      positions.push(currentPosition);
      currentPosition += height;
    }
    return positions;
  }, [itemHeights]);

  // Get visible range
  const { start, end } = useMemo(() => {
    return getVisibleRange(scrollTop, containerHeight, itemHeights, overscan);
  }, [scrollTop, containerHeight, itemHeights, overscan]);

  // Get virtual items to render
  const virtualItems: VirtualItem[] = useMemo(() => {
    const result: VirtualItem[] = [];
    for (let i = start; i < end; i++) {
      result.push({
        index: i,
        start: itemPositions[i] || 0,
        size: itemHeights[i] || 0,
      });
    }
    return result;
  }, [start, end, itemPositions, itemHeights]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setScrollTop(container.scrollTop);

    // Check if we should trigger onEndReached
    if (onEndReached && !isLoading) {
      const scrollPercentage =
        (container.scrollTop + container.clientHeight) / container.scrollHeight;
      if (scrollPercentage >= endReachedThreshold && !hasCalledEndReached.current) {
        hasCalledEndReached.current = true;
        onEndReached();
      } else if (scrollPercentage < endReachedThreshold) {
        hasCalledEndReached.current = false;
      }
    }
  }, [onEndReached, isLoading, endReachedThreshold]);

  // Set up resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Reset end reached flag when items change
  useEffect(() => {
    hasCalledEndReached.current = false;
  }, [items.length]);

  // Empty state
  if (items.length === 0 && !isLoading) {
    return emptyComponent ? <>{emptyComponent}</> : null;
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      role="list"
    >
      <div
        className={`relative ${innerClassName}`}
        style={{ height: totalHeight }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;

          const style: CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${virtualItem.start}px)`,
            height: virtualItem.size - gap,
          };

          return (
            <div
              key={keyExtractor(item, virtualItem.index)}
              style={style}
              role="listitem"
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>

      {/* Loading indicator */}
      {isLoading && loadingComponent && (
        <div className="py-4">{loadingComponent}</div>
      )}
    </div>
  );
}
