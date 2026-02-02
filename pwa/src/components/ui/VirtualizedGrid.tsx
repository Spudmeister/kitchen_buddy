/**
 * Virtualized Grid Component
 *
 * Provides efficient rendering for large grids by only rendering
 * rows that are visible in the viewport plus a buffer.
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

export interface VirtualizedGridProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each row in pixels */
  rowHeight: number;
  /** Number of columns (or 'auto' to calculate based on container width) */
  columns: number | 'auto';
  /** Minimum column width when columns is 'auto' */
  minColumnWidth?: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Number of rows to render above/below viewport (default: 2) */
  overscan?: number;
  /** Optional class name for the container */
  className?: string;
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

/**
 * VirtualizedGrid Component
 *
 * Efficiently renders large grids by only mounting rows that are
 * visible in the viewport.
 */
export function VirtualizedGrid<T>({
  items,
  rowHeight,
  columns,
  minColumnWidth = 200,
  renderItem,
  overscan = 2,
  className = '',
  keyExtractor,
  onEndReached,
  endReachedThreshold = 0.8,
  isLoading = false,
  loadingComponent,
  emptyComponent,
  gap = 16,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const hasCalledEndReached = useRef(false);

  // Calculate actual number of columns
  const actualColumns = useMemo(() => {
    if (columns !== 'auto') return columns;
    if (containerWidth === 0) return 1;
    // Calculate columns based on container width and min column width
    const availableWidth = containerWidth;
    const cols = Math.floor((availableWidth + gap) / (minColumnWidth + gap));
    return Math.max(1, cols);
  }, [columns, containerWidth, minColumnWidth, gap]);

  // Calculate number of rows
  const rowCount = useMemo(() => {
    return Math.ceil(items.length / actualColumns);
  }, [items.length, actualColumns]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    return rowCount * (rowHeight + gap) - (rowCount > 0 ? gap : 0);
  }, [rowCount, rowHeight, gap]);

  // Calculate visible row range
  const { startRow, endRow } = useMemo(() => {
    const effectiveRowHeight = rowHeight + gap;
    const start = Math.max(0, Math.floor(scrollTop / effectiveRowHeight) - overscan);
    const visibleRows = Math.ceil(containerHeight / effectiveRowHeight);
    const end = Math.min(rowCount, start + visibleRows + overscan * 2);
    return { startRow: start, endRow: end };
  }, [scrollTop, containerHeight, rowHeight, gap, rowCount, overscan]);

  // Get items to render
  const visibleItems = useMemo(() => {
    const result: Array<{ item: T; index: number; row: number; col: number }> = [];
    for (let row = startRow; row < endRow; row++) {
      for (let col = 0; col < actualColumns; col++) {
        const index = row * actualColumns + col;
        if (index < items.length) {
          result.push({
            item: items[index],
            index,
            row,
            col,
          });
        }
      }
    }
    return result;
  }, [startRow, endRow, actualColumns, items]);

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
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);
    setContainerWidth(container.clientWidth);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Reset end reached flag when items change
  useEffect(() => {
    hasCalledEndReached.current = false;
  }, [items.length]);

  // Calculate column width
  const columnWidth = useMemo(() => {
    if (containerWidth === 0) return minColumnWidth;
    const totalGap = (actualColumns - 1) * gap;
    return (containerWidth - totalGap) / actualColumns;
  }, [containerWidth, actualColumns, gap, minColumnWidth]);

  // Empty state
  if (items.length === 0 && !isLoading) {
    return emptyComponent ? <>{emptyComponent}</> : null;
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      role="grid"
      aria-rowcount={rowCount}
      aria-colcount={actualColumns}
    >
      <div
        className="relative"
        style={{ height: totalHeight }}
      >
        {visibleItems.map(({ item, index, row, col }) => {
          const style: CSSProperties = {
            position: 'absolute',
            top: row * (rowHeight + gap),
            left: col * (columnWidth + gap),
            width: columnWidth,
            height: rowHeight,
          };

          return (
            <div
              key={keyExtractor(item, index)}
              style={style}
              role="gridcell"
              aria-rowindex={row + 1}
              aria-colindex={col + 1}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>

      {/* Loading indicator */}
      {isLoading && loadingComponent && (
        <div className="py-4 flex justify-center">{loadingComponent}</div>
      )}
    </div>
  );
}
