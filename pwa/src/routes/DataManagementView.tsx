/**
 * Data Management View - Export, Import, and Clear Data
 * 
 * Provides data backup and restore functionality.
 * Requirements: 30.4, 31.1, 31.4, 31.5, 31.6
 */

import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '@hooks/useRecipes';
import { usePersonalStats } from '@hooks/useCookSessions';
import { useUIStore } from '@stores/ui-store';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { getDatabase } from '@db/browser-database';
import { RecipeService } from '@services/recipe-service';
import { StatisticsService } from '@services/statistics-service';
import type { IngredientCategory } from '../types/recipe';
import type { Unit } from '../types/units';

/**
 * Export format version
 */
const EXPORT_FORMAT_VERSION = '1.0.0';

/**
 * Export data structure
 */
interface ExportData {
  version: string;
  exportedAt: string;
  recipes: ExportedRecipe[];
  cookSessions?: ExportedCookSession[];
  ratings?: ExportedRating[];
  preferences?: Record<string, unknown>;
}

interface ExportedRecipe {
  id: string;
  title: string;
  description?: string;
  ingredients: { name: string; quantity: number; unit: string; notes?: string; category?: string }[];
  instructions: { step: number; text: string; durationMinutes?: number; notes?: string }[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  tags: string[];
  rating?: number;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExportedCookSession {
  id: string;
  recipeId: string;
  date: string;
  actualPrepMinutes?: number;
  actualCookMinutes?: number;
  servingsMade: number;
  notes?: string;
}

interface ExportedRating {
  id: string;
  recipeId: string;
  rating: number;
  ratedAt: string;
}

/**
 * Import preview state
 */
interface ImportPreview {
  data: ExportData;
  recipesCount: number;
  cookSessionsCount: number;
  ratingsCount: number;
}

export default function DataManagementView() {
  const { data: recipes, isLoading: recipesLoading } = useRecipes();
  const { data: stats } = usePersonalStats();
  const { preferences, showToast, updatePreferences } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  /**
   * Export all data as JSON
   */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const db = getDatabase();
      const recipeService = new RecipeService(db);
      const statisticsService = new StatisticsService(db);
      
      const allRecipes = recipeService.getAllRecipes();
      
      // Build export data
      const exportData: ExportData = {
        version: EXPORT_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        recipes: allRecipes.map(recipe => ({
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            category: ing.category,
          })),
          instructions: recipe.instructions.map(inst => ({
            step: inst.step,
            text: inst.text,
            durationMinutes: inst.duration?.minutes,
            notes: inst.notes,
          })),
          prepTimeMinutes: recipe.prepTime.minutes,
          cookTimeMinutes: recipe.cookTime.minutes,
          servings: recipe.servings,
          tags: recipe.tags,
          rating: recipe.rating,
          sourceUrl: recipe.sourceUrl,
          createdAt: recipe.createdAt.toISOString(),
          updatedAt: recipe.updatedAt.toISOString(),
        })),
        cookSessions: [],
        ratings: [],
        preferences: preferences as unknown as Record<string, unknown>,
      };
      
      // Get cook sessions and ratings for each recipe
      for (const recipe of allRecipes) {
        const sessions = statisticsService.getCookSessionsForRecipe(recipe.id);
        for (const session of sessions) {
          exportData.cookSessions!.push({
            id: session.id,
            recipeId: session.recipeId,
            date: session.date.toISOString(),
            actualPrepMinutes: session.actualPrepTime?.minutes,
            actualCookMinutes: session.actualCookTime?.minutes,
            servingsMade: session.servingsMade,
            notes: session.notes,
          });
        }
        
        const ratings = statisticsService.getRatingHistory(recipe.id);
        for (const rating of ratings) {
          exportData.ratings!.push({
            id: rating.id,
            recipeId: rating.recipeId,
            rating: rating.rating,
            ratedAt: rating.ratedAt.toISOString(),
          });
        }
      }
      
      // Download the file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sous-chef-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast({ type: 'success', message: 'Data exported successfully!' });
    } catch (error) {
      showToast({ type: 'error', message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setExporting(false);
    }
  }, [preferences, showToast]);

  /**
   * Handle file selection for import
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ExportData;
        
        // Validate the data
        if (!data.version || !Array.isArray(data.recipes)) {
          throw new Error('Invalid export file format');
        }
        
        setImportPreview({
          data,
          recipesCount: data.recipes.length,
          cookSessionsCount: data.cookSessions?.length || 0,
          ratingsCount: data.ratings?.length || 0,
        });
      } catch (error) {
        showToast({ type: 'error', message: `Invalid file: ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  }, [showToast]);

  /**
   * Confirm and execute import
   */
  const handleImport = useCallback(async () => {
    if (!importPreview) return;
    
    setImporting(true);
    try {
      const db = getDatabase();
      const recipeService = new RecipeService(db);
      
      let recipesImported = 0;
      const sessionsImported = 0;
      const ratingsImported = 0;
      
      // Import recipes
      for (const exportedRecipe of importPreview.data.recipes) {
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
            instructions: exportedRecipe.instructions,
            prepTimeMinutes: exportedRecipe.prepTimeMinutes,
            cookTimeMinutes: exportedRecipe.cookTimeMinutes,
            servings: exportedRecipe.servings,
            tags: exportedRecipe.tags,
            sourceUrl: exportedRecipe.sourceUrl,
          });
          recipesImported++;
        } catch {
          // Skip duplicate or invalid recipes
        }
      }
      
      // Import preferences if present
      if (importPreview.data.preferences) {
        const prefs = importPreview.data.preferences;
        if (prefs.unitSystem || prefs.defaultServings || prefs.leftoverDurationDays || prefs.theme || prefs.textSize) {
          updatePreferences({
            unitSystem: prefs.unitSystem as 'us' | 'metric' | undefined,
            defaultServings: prefs.defaultServings as number | undefined,
            leftoverDurationDays: prefs.leftoverDurationDays as number | undefined,
            theme: prefs.theme as 'light' | 'dark' | 'system' | undefined,
            textSize: prefs.textSize as 'small' | 'medium' | 'large' | undefined,
          });
        }
      }
      
      showToast({ 
        type: 'success', 
        message: `Imported ${recipesImported} recipes, ${sessionsImported} sessions, ${ratingsImported} ratings` 
      });
      setImportPreview(null);
      
      // Refresh the page to show new data
      window.location.reload();
    } catch (error) {
      showToast({ type: 'error', message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setImporting(false);
    }
  }, [importPreview, showToast, updatePreferences]);

  /**
   * Clear all data
   */
  const handleClearData = useCallback(async () => {
    if (clearConfirmText !== 'DELETE') return;
    
    try {
      // Clear IndexedDB
      const databases = await indexedDB.databases();
      for (const dbInfo of databases) {
        if (dbInfo.name) {
          indexedDB.deleteDatabase(dbInfo.name);
        }
      }
      
      // Clear localStorage
      localStorage.clear();
      
      showToast({ type: 'success', message: 'All data cleared. Reloading...' });
      
      // Reload the page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      showToast({ type: 'error', message: `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  }, [clearConfirmText, showToast]);

  if (recipesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Link to="/settings" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline mb-2 inline-block">
        ← Back to Settings
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Data Management</h1>

      {/* Current Data Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Your Data</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-600">{recipes?.length || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Recipes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{stats?.totalCookSessions || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Cook Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{stats?.uniqueRecipesCooked || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Recipes Cooked</div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Export Data</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Download all your recipes, cook sessions, and settings as a JSON file.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              Export All Data
            </>
          )}
        </button>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Import Data</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Restore recipes and settings from a previously exported JSON file.
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {!importPreview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Select File to Import
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Import Preview</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• {importPreview.recipesCount} recipes</li>
                <li>• {importPreview.cookSessionsCount} cook sessions</li>
                <li>• {importPreview.ratingsCount} ratings</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setImportPreview(null)}
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
                  'Import Data'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Data Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border-2 border-red-200 dark:border-red-900">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete all your data. This action cannot be undone.
        </p>
        
        {!showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Clear All Data
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Type "DELETE" to confirm:
            </p>
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  setClearConfirmText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={clearConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Everything
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
