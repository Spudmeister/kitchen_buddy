/**
 * Recipe Import - Import recipes from URL, photo, or JSON file
 * 
 * URL parsing, AI-powered photo extraction, and JSON file import.
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 31.4, 31.5
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecipeImportModal } from '../components/recipe';
import { ChevronLeftIcon } from '../components/icons';

export default function RecipeImport() {
  const navigate = useNavigate();
  const [showJsonImport, setShowJsonImport] = useState(false);

  const handleImportComplete = useCallback((importedCount: number) => {
    if (importedCount > 0) {
      navigate('/plan');
    }
  }, [navigate]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Recipe</h1>
      </div>

      {/* Import options */}
      <div className="space-y-4">
        {/* URL Import */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Import from URL
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Paste a recipe URL and we'll extract the recipe details automatically.
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
            Coming soon!
          </div>
        </div>

        {/* Photo Import */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Import from Photo
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Take a photo of a recipe and AI will extract the details.
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
            Coming soon! (Requires AI configuration)
          </div>
        </div>

        {/* JSON Import */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Import from File
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Import recipes from a JSON file exported from Sous Chef.
          </p>
          <button
            onClick={() => setShowJsonImport(true)}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Select JSON File
          </button>
        </div>
      </div>

      {/* JSON Import Modal */}
      <RecipeImportModal
        isOpen={showJsonImport}
        onClose={() => setShowJsonImport(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
