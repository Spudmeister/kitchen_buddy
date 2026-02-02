/**
 * Substitution Panel Component
 *
 * Displays ingredient substitution alternatives with conversion ratios and notes.
 * Opens as a bottom sheet on mobile or a dropdown panel on desktop.
 *
 * Requirements: 9.2, 9.3, 9.4
 */

import { useCallback } from 'react';
import type { Ingredient } from '../../types/recipe';
import type { Substitution } from '../../types/substitution';
import { XMarkIcon, ArrowsRightLeftIcon, InformationCircleIcon, CheckIcon } from '../icons';

/**
 * Format ratio for display
 */
function formatRatio(ratio: number): string {
  if (ratio === 1) return '1:1';
  if (ratio === 0.5) return '1:2';
  if (ratio === 0.25) return '1:4';
  if (ratio === 0.33 || ratio === 0.333) return '1:3';
  if (ratio === 0.67 || ratio === 0.667) return '2:3';
  if (ratio === 0.75) return '3:4';
  if (ratio === 2) return '2:1';
  if (ratio === 3) return '3:1';
  if (ratio === 1.5) return '3:2';
  return `${ratio}:1`;
}

/**
 * Format the conversion description
 */
function formatConversion(ratio: number, originalQuantity: number, unit?: string): string {
  const newQuantity = originalQuantity * ratio;
  const formattedQuantity = newQuantity % 1 === 0 
    ? newQuantity.toString() 
    : newQuantity.toFixed(2).replace(/\.?0+$/, '');
  
  if (unit) {
    return `Use ${formattedQuantity} ${unit}`;
  }
  return `Use ${formattedQuantity}× the amount`;
}

/**
 * Substitution Panel props
 */
export interface SubstitutionPanelProps {
  /** The ingredient to show substitutions for */
  ingredient: Ingredient;
  /** Available substitutions */
  substitutions: Substitution[];
  /** Currently selected substitution (if any) */
  selectedSubstitution?: Substitution;
  /** Callback when a substitution is selected */
  onSelect: (substitution: Substitution) => void;
  /** Callback when the panel is closed */
  onClose: () => void;
  /** Whether the panel is open */
  isOpen: boolean;
  className?: string;
}

/**
 * Substitution Item Component
 */
function SubstitutionItem({
  substitution,
  originalQuantity,
  isSelected,
  onSelect,
}: {
  substitution: Substitution;
  originalQuantity: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      aria-pressed={isSelected}
      data-testid={`substitution-${substitution.substitute.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {substitution.substitute}
            </span>
            {isSelected && (
              <CheckIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            )}
          </div>
          
          {/* Conversion ratio */}
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
            <ArrowsRightLeftIcon className="w-4 h-4 flex-shrink-0" />
            <span data-testid="substitution-ratio">
              Ratio: {formatRatio(substitution.ratio)}
            </span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span>
              {formatConversion(substitution.ratio, originalQuantity, substitution.unit)}
            </span>
          </div>
          
          {/* Notes about differences */}
          {substitution.notes && (
            <div className="flex items-start gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span data-testid="substitution-notes">{substitution.notes}</span>
            </div>
          )}
        </div>
        
        {/* Category badge */}
        <span className="flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
          {substitution.category}
        </span>
      </div>
    </button>
  );
}

/**
 * Substitution Panel Component
 */
export function SubstitutionPanel({
  ingredient,
  substitutions,
  selectedSubstitution,
  onSelect,
  onClose,
  isOpen,
  className = '',
}: SubstitutionPanelProps) {
  const handleSelect = useCallback(
    (substitution: Substitution) => {
      onSelect(substitution);
    },
    [onSelect]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="substitution-panel-title"
      data-testid="substitution-panel"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      
      {/* Panel */}
      <div
        className={`relative w-full md:max-w-lg max-h-[80vh] bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-xl overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div>
            <h2
              id="substitution-panel-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Substitutes for {ingredient.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {substitutions.length} alternative{substitutions.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close substitution panel"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {substitutions.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No substitutions available for this ingredient.
            </p>
          ) : (
            <div className="space-y-3">
              {substitutions.map((substitution, index) => (
                <SubstitutionItem
                  key={`${substitution.substitute}-${index}`}
                  substitution={substitution}
                  originalQuantity={ingredient.quantity}
                  isSelected={selectedSubstitution?.substitute === substitution.substitute}
                  onSelect={() => handleSelect(substitution)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with clear selection option */}
        {selectedSubstitution && (
          <div className="sticky bottom-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Use {selectedSubstitution.substitute}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
