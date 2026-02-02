/**
 * Recipe Export Modal Component
 *
 * Allows users to export a recipe in PDF or JSON format.
 * Requirements: 31.1, 31.2, 31.3
 */

import { useState, useCallback } from 'react';
import type { Recipe } from '../../types/recipe';
import { exportRecipeToPdf, exportRecipeToJson } from '../../services/export-service';
import { useUIStore } from '../../stores/ui-store';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface RecipeExportModalProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'pdf' | 'json';

/**
 * Recipe Export Modal
 */
export function RecipeExportModal({ recipe, isOpen, onClose }: RecipeExportModalProps) {
  const { showToast } = useUIStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      if (selectedFormat === 'pdf') {
        exportRecipeToPdf(recipe);
        showToast({ type: 'success', message: 'Recipe exported as PDF', duration: 3000 });
      } else {
        exportRecipeToJson(recipe);
        showToast({ type: 'success', message: 'Recipe exported as JSON', duration: 3000 });
      }
      onClose();
    } catch (error) {
      showToast({ 
        type: 'error', 
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000 
      });
    } finally {
      setExporting(false);
    }
  }, [recipe, selectedFormat, showToast, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Recipe">
      <div className="p-4 space-y-6">
        {/* Recipe info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white">{recipe.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {recipe.ingredients.length} ingredients • {recipe.instructions.length} steps
          </p>
        </div>

        {/* Format selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Export Format
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={selectedFormat === 'pdf'}
                onChange={() => setSelectedFormat('pdf')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">PDF Document</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Formatted, printable document perfect for printing or sharing
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <input
                type="radio"
                name="format"
                value="json"
                checked={selectedFormat === 'json'}
                onChange={() => setSelectedFormat('json')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">JSON File</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Data file that can be imported into Sous Chef or other apps
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <LoadingSpinner size="sm" />
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
