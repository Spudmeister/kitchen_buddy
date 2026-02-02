/**
 * Filter Panel Component
 *
 * Filter controls for recipe library.
 *
 * Requirements: 3.3, 3.7, 32.1
 */

import { useCallback, useId } from 'react';
import { useAllTags, useAllFolders } from '../../hooks/useRecipes';
import { DIETARY_TAGS, type RecipeFilters } from '../../types/search';
import { StarIcon, ClockIcon, TagIcon, FolderIcon, XMarkIcon } from '../icons';

/**
 * Props for FilterPanel component
 */
export interface FilterPanelProps {
  filters: RecipeFilters;
  onChange: (filters: Partial<RecipeFilters>) => void;
  onClear: () => void;
}

/**
 * Rating filter options
 */
const RATING_OPTIONS = [
  { value: 5, label: '5 stars' },
  { value: 4, label: '4+ stars' },
  { value: 3, label: '3+ stars' },
];

/**
 * Cook time filter options (in minutes)
 */
const COOK_TIME_OPTIONS = [
  { value: 15, label: '15 min or less' },
  { value: 30, label: '30 min or less' },
  { value: 60, label: '1 hour or less' },
  { value: 120, label: '2 hours or less' },
];

/**
 * Filter Panel Component
 */
export function FilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
  const { data: allTags = [] } = useAllTags();
  const { data: allFolders = [] } = useAllFolders();
  
  // Generate unique IDs for accessibility
  const dietaryGroupId = useId();
  const tagsGroupId = useId();
  const ratingGroupId = useId();
  const timeGroupId = useId();
  const folderLabelId = useId();

  // Toggle a tag in the filter
  const toggleTag = useCallback(
    (tag: string) => {
      const currentTags = filters.tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      onChange({ tags: newTags.length > 0 ? newTags : undefined });
    },
    [filters.tags, onChange]
  );

  // Set rating filter
  const setRating = useCallback(
    (rating: number | undefined) => {
      onChange({ minRating: rating });
    },
    [onChange]
  );

  // Set cook time filter
  const setCookTime = useCallback(
    (time: number | undefined) => {
      onChange({ maxCookTime: time });
    },
    [onChange]
  );

  // Set folder filter
  const setFolder = useCallback(
    (folderId: string | undefined) => {
      onChange({ folderId });
    },
    [onChange]
  );

  // Check if any filters are active
  const hasActiveFilters =
    (filters.tags && filters.tags.length > 0) ||
    filters.minRating !== undefined ||
    filters.maxCookTime !== undefined ||
    filters.folderId !== undefined;

  // Count active filters for screen reader announcement
  const activeFilterCount = [
    filters.tags?.length || 0,
    filters.minRating !== undefined ? 1 : 0,
    filters.maxCookTime !== undefined ? 1 : 0,
    filters.folderId !== undefined ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div 
      className="space-y-4"
      role="region"
      aria-label={`Recipe filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
    >
      {/* Clear filters button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={onClear}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            aria-label={`Clear all ${activeFilterCount} active filters`}
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
            Clear all filters
          </button>
        </div>
      )}

      {/* Dietary tags (built-in) */}
      <fieldset>
        <legend 
          id={dietaryGroupId}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
        >
          <TagIcon className="w-4 h-4" aria-hidden="true" />
          Dietary
        </legend>
        <div 
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby={dietaryGroupId}
        >
          {DIETARY_TAGS.map((tag) => {
            const isSelected = filters.tags?.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 text-sm rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-pressed={isSelected}
                aria-label={`${tag}${isSelected ? ', selected' : ''}`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Custom tags */}
      {allTags.length > 0 && (
        <fieldset>
          <legend 
            id={tagsGroupId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Tags
          </legend>
          <div 
            className="flex flex-wrap gap-2 max-h-24 overflow-y-auto"
            role="group"
            aria-labelledby={tagsGroupId}
          >
            {allTags
              .filter((tag) => !DIETARY_TAGS.includes(tag as typeof DIETARY_TAGS[number]))
              .map((tag) => {
                const isSelected = filters.tags?.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                      isSelected
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`${tag}${isSelected ? ', selected' : ''}`}
                  >
                    {tag}
                  </button>
                );
              })}
          </div>
        </fieldset>
      )}

      {/* Rating filter */}
      <fieldset>
        <legend 
          id={ratingGroupId}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
        >
          <StarIcon className="w-4 h-4" aria-hidden="true" />
          Rating
        </legend>
        <div 
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby={ratingGroupId}
        >
          {RATING_OPTIONS.map((option) => {
            const isSelected = filters.minRating === option.value;
            return (
              <button
                key={option.value}
                onClick={() =>
                  setRating(isSelected ? undefined : option.value)
                }
                className={`px-3 py-1 text-sm rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-pressed={isSelected}
                aria-label={`${option.label}${isSelected ? ', selected' : ''}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Cook time filter */}
      <fieldset>
        <legend 
          id={timeGroupId}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
        >
          <ClockIcon className="w-4 h-4" aria-hidden="true" />
          Total Time
        </legend>
        <div 
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby={timeGroupId}
        >
          {COOK_TIME_OPTIONS.map((option) => {
            const isSelected = filters.maxCookTime === option.value;
            return (
              <button
                key={option.value}
                onClick={() =>
                  setCookTime(isSelected ? undefined : option.value)
                }
                className={`px-3 py-1 text-sm rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-pressed={isSelected}
                aria-label={`${option.label}${isSelected ? ', selected' : ''}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Folder filter */}
      {allFolders.length > 0 && (
        <div>
          <label 
            id={folderLabelId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
          >
            <FolderIcon className="w-4 h-4" aria-hidden="true" />
            Folder
          </label>
          <select
            value={filters.folderId || ''}
            onChange={(e) => setFolder(e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-labelledby={folderLabelId}
          >
            <option value="">All folders</option>
            {allFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
