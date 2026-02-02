/**
 * Shopping List Component
 *
 * Displays a shopping list with category grouping and progress.
 * Uses virtualization for large lists.
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 33.6
 */

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { ShoppingList as ShoppingListType, ShoppingItem as ShoppingItemType } from '@/types/shopping';
import type { IngredientCategory } from '@/types/recipe';
import { ShoppingItem } from './ShoppingItem';

/**
 * Category display names and icons
 */
const CATEGORY_INFO: Record<IngredientCategory, { name: string; emoji: string }> = {
  produce: { name: 'Produce', emoji: '🥬' },
  meat: { name: 'Meat', emoji: '🥩' },
  seafood: { name: 'Seafood', emoji: '🐟' },
  dairy: { name: 'Dairy', emoji: '🧀' },
  bakery: { name: 'Bakery', emoji: '🍞' },
  frozen: { name: 'Frozen', emoji: '🧊' },
  pantry: { name: 'Pantry', emoji: '🥫' },
  spices: { name: 'Spices', emoji: '🌶️' },
  beverages: { name: 'Beverages', emoji: '🥤' },
  other: { name: 'Other', emoji: '📦' },
};

/**
 * Category order for display
 */
const CATEGORY_ORDER: IngredientCategory[] = [
  'produce',
  'meat',
  'seafood',
  'dairy',
  'bakery',
  'frozen',
  'pantry',
  'spices',
  'beverages',
  'other',
];

interface ShoppingListProps {
  list: ShoppingListType;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onDeleteItem?: (itemId: string) => void;
  recipeTitles?: Map<string, string>;
  /** Enable virtualization for large lists (default: true) */
  virtualized?: boolean;
}

/** Item height for virtualization */
const ITEM_HEIGHT = 56;
const CATEGORY_HEADER_HEIGHT = 40;

export function ShoppingList({
  list,
  onToggleItem,
  onDeleteItem,
  recipeTitles,
  virtualized = true,
}: ShoppingListProps) {
  // Group items by category and separate checked items
  // Requirements: 18.3 - Items organized by store category
  // Requirements: 19.2 - Checked items move to bottom
  const { uncheckedByCategory, checkedItems, flatItems } = useMemo(() => {
    const unchecked = new Map<IngredientCategory, ShoppingItemType[]>();
    const checked: ShoppingItemType[] = [];

    // Initialize categories
    for (const category of CATEGORY_ORDER) {
      unchecked.set(category, []);
    }

    // Sort items into categories
    for (const item of list.items) {
      if (item.checked) {
        checked.push(item);
      } else {
        const category = item.category ?? 'other';
        const categoryItems = unchecked.get(category);
        if (categoryItems) {
          categoryItems.push(item);
        } else {
          unchecked.get('other')!.push(item);
        }
      }
    }

    // Remove empty categories
    for (const [category, items] of unchecked) {
      if (items.length === 0) {
        unchecked.delete(category);
      }
    }

    // Create flat list for virtualization
    const flat: Array<{ type: 'header' | 'item'; category?: IngredientCategory; item?: ShoppingItemType; isCheckedSection?: boolean }> = [];
    
    for (const [category, items] of unchecked) {
      flat.push({ type: 'header', category });
      for (const item of items) {
        flat.push({ type: 'item', item, category });
      }
    }

    if (checked.length > 0) {
      flat.push({ type: 'header', isCheckedSection: true });
      for (const item of checked) {
        flat.push({ type: 'item', item, isCheckedSection: true });
      }
    }

    return { uncheckedByCategory: unchecked, checkedItems: checked, flatItems: flat };
  }, [list.items]);

  // Check if item is custom (no recipe associations)
  const isCustomItem = (item: ShoppingItemType) => item.recipeIds.length === 0;

  // Use virtualization for large lists (> 30 items)
  const shouldVirtualize = virtualized && flatItems.length > 30;

  if (shouldVirtualize) {
    return (
      <VirtualizedShoppingList
        flatItems={flatItems}
        onToggleItem={onToggleItem}
        onDeleteItem={onDeleteItem}
        recipeTitles={recipeTitles}
        isCustomItem={isCustomItem}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Unchecked items by category */}
      {Array.from(uncheckedByCategory.entries()).map(([category, items]) => {
        const info = CATEGORY_INFO[category];
        return (
          <div key={category}>
            <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span>{info.emoji}</span>
              <span>{info.name}</span>
              <span className="text-gray-400 dark:text-gray-500">({items.length})</span>
            </h3>
            <div className="space-y-1">
              {items.map((item) => (
                <ShoppingItem
                  key={item.id}
                  item={item}
                  onToggle={(checked) => onToggleItem(item.id, checked)}
                  onDelete={isCustomItem(item) && onDeleteItem ? () => onDeleteItem(item.id) : undefined}
                  isCustom={isCustomItem(item)}
                  recipeTitles={recipeTitles}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Checked items section - Requirements: 19.2 */}
      {checkedItems.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-400 dark:text-gray-500 mb-2">
            <span>✓</span>
            <span>Checked Off</span>
            <span>({checkedItems.length})</span>
          </h3>
          <div className="space-y-1 opacity-60">
            {checkedItems.map((item) => (
              <ShoppingItem
                key={item.id}
                item={item}
                onToggle={(checked) => onToggleItem(item.id, checked)}
                onDelete={isCustomItem(item) && onDeleteItem ? () => onDeleteItem(item.id) : undefined}
                isCustom={isCustomItem(item)}
                recipeTitles={recipeTitles}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {list.items.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No items in your shopping list.</p>
          <p className="text-sm mt-1">Add recipes to your menu to generate a list.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Virtualized Shopping List Component
 * 
 * Renders only visible items for performance with large shopping lists.
 */
interface VirtualizedShoppingListProps {
  flatItems: Array<{ type: 'header' | 'item'; category?: IngredientCategory; item?: ShoppingItemType; isCheckedSection?: boolean }>;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onDeleteItem?: (itemId: string) => void;
  recipeTitles?: Map<string, string>;
  isCustomItem: (item: ShoppingItemType) => boolean;
}

function VirtualizedShoppingList({
  flatItems,
  onToggleItem,
  onDeleteItem,
  recipeTitles,
  isCustomItem,
}: VirtualizedShoppingListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate item heights
  const itemHeights = useMemo(() => {
    return flatItems.map((item) => 
      item.type === 'header' ? CATEGORY_HEADER_HEIGHT : ITEM_HEIGHT
    );
  }, [flatItems]);

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

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    const overscan = 5;
    let start = 0;
    let accumulatedHeight = 0;

    // Find start index
    for (let i = 0; i < itemPositions.length; i++) {
      if ((itemPositions[i] || 0) + (itemHeights[i] || 0) > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
    }

    // Find end index
    let end = start;
    for (let i = start; i < flatItems.length; i++) {
      if ((itemPositions[i] || 0) > scrollTop + containerHeight) {
        end = Math.min(flatItems.length, i + overscan);
        break;
      }
      end = i + 1;
    }

    return { startIndex: start, endIndex: Math.min(end + overscan, flatItems.length) };
  }, [scrollTop, containerHeight, itemPositions, itemHeights, flatItems.length]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setScrollTop(container.scrollTop);
    }
  }, []);

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

    return () => resizeObserver.disconnect();
  }, []);

  // Get visible items
  const visibleItems = useMemo(() => {
    return flatItems.slice(startIndex, endIndex).map((item, i) => ({
      ...item,
      index: startIndex + i,
      top: itemPositions[startIndex + i] || 0,
      height: itemHeights[startIndex + i] || ITEM_HEIGHT,
    }));
  }, [flatItems, startIndex, endIndex, itemPositions, itemHeights]);

  return (
    <div
      ref={containerRef}
      className="overflow-auto h-[calc(100vh-250px)] min-h-[300px]"
      onScroll={handleScroll}
      role="list"
      aria-label="Shopping list"
    >
      <div className="relative" style={{ height: totalHeight }}>
        {visibleItems.map((item) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            top: item.top,
            left: 0,
            right: 0,
            height: item.height,
          };

          if (item.type === 'header') {
            if (item.isCheckedSection) {
              return (
                <div key={`header-checked`} style={style} className="flex items-center">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-gray-400 dark:text-gray-500">
                    <span>✓</span>
                    <span>Checked Off</span>
                  </h3>
                </div>
              );
            }
            const info = CATEGORY_INFO[item.category!];
            return (
              <div key={`header-${item.category}`} style={style} className="flex items-center">
                <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span>{info.emoji}</span>
                  <span>{info.name}</span>
                </h3>
              </div>
            );
          }

          const shoppingItem = item.item!;
          return (
            <div
              key={shoppingItem.id}
              style={style}
              className={item.isCheckedSection ? 'opacity-60' : ''}
            >
              <ShoppingItem
                item={shoppingItem}
                onToggle={(checked) => onToggleItem(shoppingItem.id, checked)}
                onDelete={isCustomItem(shoppingItem) && onDeleteItem ? () => onDeleteItem(shoppingItem.id) : undefined}
                isCustom={isCustomItem(shoppingItem)}
                recipeTitles={recipeTitles}
              />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {flatItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No items in your shopping list.</p>
          <p className="text-sm mt-1">Add recipes to your menu to generate a list.</p>
        </div>
      )}
    </div>
  );
}
