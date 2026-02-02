/**
 * Sue Constraints Panel Component
 *
 * Allows users to set constraints for Sue's suggestions:
 * - Dietary restrictions
 * - Time limits
 * - Available/excluded ingredients
 * - Rating and tag filters
 *
 * Requirements: 16.5
 */

import { useState, useCallback } from 'react';
import type { MenuConstraints } from '@/types/sue';
import {
  XMarkIcon,
  ClockIcon,
  TagIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
} from '@components/icons';

/**
 * Common dietary restrictions
 */
const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'nut-free', label: 'Nut-Free' },
  { id: 'low-carb', label: 'Low-Carb' },
];

/**
 * Time limit presets
 */
const TIME_PRESETS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
];

/**
 * Props for SueConstraintsPanel
 */
export interface SueConstraintsPanelProps {
  constraints: MenuConstraints;
  onChange: (constraints: MenuConstraints) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Chip component for tags/selections
 */
function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-sm font-medium
        transition-colors
        ${
          selected
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }
      `}
    >
      {label}
    </button>
  );
}

/**
 * Tag input component
 */
function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleAdd = useCallback(() => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput('');
    }
  }, [input, value, onChange]);

  const handleRemove = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
            >
              {tag}
              <button
                onClick={() => handleRemove(tag)}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                aria-label={`Remove ${tag}`}
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Sue Constraints Panel Component
 */
export function SueConstraintsPanel({
  constraints,
  onChange,
  isOpen,
  onClose,
}: SueConstraintsPanelProps) {
  const toggleDietary = useCallback(
    (id: string) => {
      const current = constraints.dietaryRestrictions || [];
      const updated = current.includes(id)
        ? current.filter((d) => d !== id)
        : [...current, id];
      onChange({ ...constraints, dietaryRestrictions: updated });
    },
    [constraints, onChange]
  );

  const setMaxTotalTime = useCallback(
    (time: number | undefined) => {
      onChange({ ...constraints, maxTotalTime: time });
    },
    [constraints, onChange]
  );

  const setMinRating = useCallback(
    (rating: number | undefined) => {
      onChange({ ...constraints, minRating: rating });
    },
    [constraints, onChange]
  );

  const setAvailableIngredients = useCallback(
    (ingredients: string[]) => {
      onChange({
        ...constraints,
        availableIngredients: ingredients.length > 0 ? ingredients : undefined,
      });
    },
    [constraints, onChange]
  );

  const setExcludeIngredients = useCallback(
    (ingredients: string[]) => {
      onChange({
        ...constraints,
        excludeIngredients: ingredients.length > 0 ? ingredients : undefined,
      });
    },
    [constraints, onChange]
  );

  const setIncludeTags = useCallback(
    (tags: string[]) => {
      onChange({
        ...constraints,
        includeTags: tags.length > 0 ? tags : undefined,
      });
    },
    [constraints, onChange]
  );

  const clearAll = useCallback(() => {
    onChange({});
  }, [onChange]);

  const hasConstraints =
    (constraints.dietaryRestrictions && constraints.dietaryRestrictions.length > 0) ||
    constraints.maxTotalTime !== undefined ||
    constraints.minRating !== undefined ||
    (constraints.availableIngredients && constraints.availableIngredients.length > 0) ||
    (constraints.excludeIngredients && constraints.excludeIngredients.length > 0) ||
    (constraints.includeTags && constraints.includeTags.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Constraints
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {hasConstraints && (
              <button
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Dietary Restrictions */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Dietary Restrictions
            </h3>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  label={option.label}
                  selected={(constraints.dietaryRestrictions || []).includes(option.id)}
                  onClick={() => toggleDietary(option.id)}
                />
              ))}
            </div>
          </section>

          {/* Time Limit */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              Max Total Time
            </h3>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="Any"
                selected={constraints.maxTotalTime === undefined}
                onClick={() => setMaxTotalTime(undefined)}
              />
              {TIME_PRESETS.map((preset) => (
                <Chip
                  key={preset.value}
                  label={preset.label}
                  selected={constraints.maxTotalTime === preset.value}
                  onClick={() => setMaxTotalTime(preset.value)}
                />
              ))}
            </div>
          </section>

          {/* Minimum Rating */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <StarIcon className="w-4 h-4" />
              Minimum Rating
            </h3>
            <div className="flex flex-wrap gap-2">
              <Chip
                label="Any"
                selected={constraints.minRating === undefined}
                onClick={() => setMinRating(undefined)}
              />
              {[3, 4, 5].map((rating) => (
                <Chip
                  key={rating}
                  label={`${rating}+ stars`}
                  selected={constraints.minRating === rating}
                  onClick={() => setMinRating(rating)}
                />
              ))}
            </div>
          </section>

          {/* Available Ingredients */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Available Ingredients
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              What do you have on hand?
            </p>
            <TagInput
              value={constraints.availableIngredients || []}
              onChange={setAvailableIngredients}
              placeholder="e.g., chicken, broccoli"
            />
          </section>

          {/* Exclude Ingredients */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Exclude Ingredients
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Allergies or ingredients to avoid
            </p>
            <TagInput
              value={constraints.excludeIngredients || []}
              onChange={setExcludeIngredients}
              placeholder="e.g., shellfish, peanuts"
            />
          </section>

          {/* Include Tags */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              Include Tags
            </h3>
            <TagInput
              value={constraints.includeTags || []}
              onChange={setIncludeTags}
              placeholder="e.g., italian, quick"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Apply Constraints
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact constraints summary for display
 */
export function SueConstraintsSummary({
  constraints,
  onEdit,
}: {
  constraints: MenuConstraints;
  onEdit: () => void;
}) {
  const items: string[] = [];

  if (constraints.dietaryRestrictions && constraints.dietaryRestrictions.length > 0) {
    items.push(constraints.dietaryRestrictions.join(', '));
  }
  if (constraints.maxTotalTime) {
    items.push(`≤${constraints.maxTotalTime}min`);
  }
  if (constraints.minRating) {
    items.push(`${constraints.minRating}+ stars`);
  }
  if (constraints.availableIngredients && constraints.availableIngredients.length > 0) {
    items.push(`with: ${constraints.availableIngredients.slice(0, 2).join(', ')}${constraints.availableIngredients.length > 2 ? '...' : ''}`);
  }
  if (constraints.excludeIngredients && constraints.excludeIngredients.length > 0) {
    items.push(`no: ${constraints.excludeIngredients.slice(0, 2).join(', ')}${constraints.excludeIngredients.length > 2 ? '...' : ''}`);
  }

  if (items.length === 0) {
    return (
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
      >
        <AdjustmentsHorizontalIcon className="w-4 h-4" />
        Add constraints
      </button>
    );
  }

  return (
    <button
      onClick={onEdit}
      className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
    >
      <AdjustmentsHorizontalIcon className="w-4 h-4" />
      <span className="truncate max-w-xs">{items.join(' • ')}</span>
    </button>
  );
}
