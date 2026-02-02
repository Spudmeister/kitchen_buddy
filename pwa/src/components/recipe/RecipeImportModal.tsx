/**
 * Recipe Import Modal Component
 *
 * Allows users to import recipes from JSON files.
 * Requirements: 31.4, 31.5
 */

import { useState, useCallback, useRef } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  parseImportFile, 
  getImportPreview,
  type RecipeExportData,
  type ImportValidationError,
} from '../../services/export-service';
import { RecipeService } from '../../services/recipe-service';
import { getDatabase } from '../../db/browser-database';
import type { IngredientCategory } from '../../types/recipe';
import type { Unit } from '../../types/units';

export interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (importedCount: number) => void;
}

interface ImportPreview {
  data: RecipeExportData;
  recipesCount: number;
  recipes: { title: string; ingredientsCount: number; instructionsCount: number }[];
}

/**
 * Recipe Import Modal
 */
export function RecipeImportModal({ isOpen, onClose, onImportComplete }: RecipeImportModalProps) {
  const { showToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errors, setErrors] = useState<ImportValidationError[]>([]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseImportFile(content);
      
      if (result.errors.length > 0) {
        setErrors(result.errors);
        setPreview(null);
      } else if (result.data) {
        const previewInfo = getImportPreview(result.data);
        setPreview({
          data: result.data,
          ...previewInfo,
        });
        setErrors([]);
      }
    };
    reader.readAsText(file);

    // Reset the input
    event.target.value = '';
  }, []);

  const handleImport = useCallback(async () => {
    if (!preview) return;

    setImporting(true);
    try {
      const db = getDatabase();
      const recipeService = new RecipeService(db);
      
      let importedCount = 0;
      const importErrors: string[] = [];

      for (const exportedRecipe of preview.data.recipes) {
        try {
          recipeService.createRecipe({
            title: exportedRecipe.title,
            description: exportedRecipe.description,
            ingredients: exportedRecipe.ingredients.map(ing => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit as Unit,
              notes: ing.notes,
              category: ing.category as IngredientCategory | undefined,
            })),
            instructions: exportedRecipe.instructions.map(inst => ({
              text: inst.text,
              durationMinutes: inst.durationMinutes,
              notes: inst.notes,
            })),
            prepTimeMinutes: exportedRecipe.prepTimeMinutes,
            cookTimeMinutes: exportedRecipe.cookTimeMinutes,
            servings: exportedRecipe.servings,
            tags: exportedRecipe.tags,
            sourceUrl: exportedRecipe.sourceUrl,
          });
          importedCount++;
        } catch (error) {
          importErrors.push(`${exportedRecipe.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (importedCount > 0) {
        showToast({ 
          type: 'success', 
          message: `Imported ${importedCount} recipe${importedCount !== 1 ? 's' : ''}`,
          duration: 3000 
        });
        onImportComplete?.(importedCount);
        onClose();
      }

      if (importErrors.length > 0) {
        showToast({ 
          type: 'error', 
          message: `${importErrors.length} recipe(s) failed to import`,
          duration: 5000 
        });
      }
    } catch (error) {
      showToast({ 
        type: 'error', 
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000 
      });
    } finally {
      setImporting(false);
    }
  }, [preview, showToast, onClose, onImportComplete]);

  const handleCancel = useCallback(() => {
    setPreview(null);
    setErrors([]);
    onClose();
  }, [onClose]);

  const handleReset = useCallback(() => {
    setPreview(null);
    setErrors([]);
  }, []);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Import Recipes" maxWidth="lg">
      <div className="p-4 space-y-6">
        {/* File selection */}
        {!preview && errors.length === 0 && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a JSON file exported from Sous Chef to import recipes.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="font-medium">Select JSON File</span>
              <span className="text-xs">or drag and drop</span>
            </button>
          </>
        )}

        {/* Validation errors */}
        {errors.length > 0 && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Invalid File
              </h3>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>
                    • {error.recipeIndex !== undefined ? `Recipe ${error.recipeIndex + 1}: ` : ''}
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Try Another File
            </button>
          </div>
        )}

        {/* Import preview */}
        {preview && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <h3 className="font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                Ready to Import
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                {preview.recipesCount} recipe{preview.recipesCount !== 1 ? 's' : ''} found
              </p>
              
              {/* Recipe list preview */}
              <div className="max-h-48 overflow-y-auto space-y-2">
                {preview.recipes.map((recipe, index) => (
                  <div 
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded p-2 text-sm"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {recipe.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {recipe.ingredientsCount} ingredients • {recipe.instructionsCount} steps
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Importing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import {preview.recipesCount} Recipe{preview.recipesCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
