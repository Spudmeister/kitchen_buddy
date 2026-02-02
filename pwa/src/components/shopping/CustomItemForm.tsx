/**
 * Custom Item Form Component
 *
 * Form for adding non-recipe items to shopping list.
 * Requirements: 20.1, 20.2, 20.3, 20.4
 */

import { useState, useCallback } from 'react';
import type { CustomItemInput } from '@/types/shopping';
import type { IngredientCategory } from '@/types/recipe';
import type { Unit } from '@/types/units';
import { PlusIcon, XMarkIcon } from '@components/icons';

/**
 * Category options for custom items
 */
const CATEGORY_OPTIONS: { value: IngredientCategory; label: string }[] = [
  { value: 'produce', label: 'Produce' },
  { value: 'meat', label: 'Meat' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'spices', label: 'Spices' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'other', label: 'Other' },
];

/**
 * Common unit options
 */
const UNIT_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'piece', label: 'piece' },
  { value: 'lb', label: 'lb' },
  { value: 'oz', label: 'oz' },
  { value: 'cup', label: 'cup' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'tsp', label: 'tsp' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'L' },
];

interface CustomItemFormProps {
  onAdd: (input: CustomItemInput) => void;
  isLoading?: boolean;
}

export function CustomItemForm({ onAdd, isLoading = false }: CustomItemFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<Unit>('piece');
  const [category, setCategory] = useState<IngredientCategory>('other');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      onAdd({
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit,
        category,
      });

      // Reset form
      setName('');
      setQuantity('1');
      setUnit('piece');
      setCategory('other');
      setIsExpanded(false);
    },
    [name, quantity, unit, category, onAdd]
  );

  const handleCancel = useCallback(() => {
    setName('');
    setQuantity('1');
    setUnit('piece');
    setCategory('other');
    setIsExpanded(false);
  }, []);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 w-full p-3 text-left text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        <span className="font-medium">Add custom item</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-white">Add Custom Item</h4>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Item name */}
      <div>
        <label htmlFor="item-name" className="sr-only">
          Item name
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          autoFocus
          required
        />
      </div>

      {/* Quantity and unit */}
      <div className="flex gap-2">
        <div className="w-24">
          <label htmlFor="item-quantity" className="sr-only">
            Quantity
          </label>
          <input
            id="item-quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="0.1"
            step="0.1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="item-unit" className="sr-only">
            Unit
          </label>
          <select
            id="item-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category - Requirements: 20.2 */}
      <div>
        <label htmlFor="item-category" className="sr-only">
          Category
        </label>
        <select
          id="item-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as IngredientCategory)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="flex-1 px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Adding...' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}
