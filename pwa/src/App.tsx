import { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { initializeDatabase, getDatabase } from '@db/browser-database';
import { RecipeService } from '@services/recipe-service';
import { getSampleRecipes } from '@services/seed-data';

// Lazy load route components for code splitting
// Main flow views
const PlanningView = lazy(() => import('@routes/PlanningView'));
const ShoppingView = lazy(() => import('@routes/ShoppingView'));
const CookingView = lazy(() => import('@routes/CookingView'));
const RecipeLibraryView = lazy(() => import('@routes/RecipeLibraryView'));

// Planning sub-views
const BrainstormView = lazy(() => import('@routes/BrainstormView'));
const SueChatView = lazy(() => import('@routes/SueChatView'));
const RecommendationsView = lazy(() => import('@routes/RecommendationsView'));

// Cooking sub-views
const CookMode = lazy(() => import('@routes/CookMode'));
const MealPrepView = lazy(() => import('@routes/MealPrepView'));

// Recipe routes
const RecipeDetail = lazy(() => import('@routes/RecipeDetail'));
const RecipeEditor = lazy(() => import('@routes/RecipeEditor'));
const RecipeImport = lazy(() => import('@routes/RecipeImport'));
const RecipeHistory = lazy(() => import('@routes/RecipeHistory'));

// Settings and stats
const SettingsView = lazy(() => import('@routes/SettingsView'));
const DataManagementView = lazy(() => import('@routes/DataManagementView'));
const StatisticsView = lazy(() => import('@routes/StatisticsView'));
const YearInReview = lazy(() => import('@routes/YearInReview'));

// Search
const SearchView = lazy(() => import('@routes/SearchView'));

/**
 * Loading fallback component for lazy-loaded routes
 */
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

/**
 * Main App component
 * 
 * Provides:
 * - Database initialization
 * - Route configuration with lazy loading
 * - App shell wrapper
 * 
 * Requirements: 1.1, 2.6
 */
function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase()
      .then(async () => {
        // Seed sample recipes if database is empty
        const db = getDatabase();
        const recipeService = new RecipeService(db);
        const existingRecipes = recipeService.getAllRecipes();
        
        if (existingRecipes.length === 0) {
          console.log('[App] Seeding database with sample recipes...');
          const sampleRecipes = getSampleRecipes();
          for (const recipe of sampleRecipes) {
            recipeService.createRecipe(recipe);
          }
          console.log(`[App] Added ${sampleRecipes.length} sample recipes`);
        }
        
        setDbReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setDbError(err instanceof Error ? err.message : 'Unknown error');
      });
  }, []);

  if (dbError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Database Error</h1>
          <p className="text-gray-600">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <AppShell>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Main flows - redirect root to plan */}
          <Route path="/" element={<Navigate to="/plan" replace />} />
          
          {/* Planning flow */}
          <Route path="/plan" element={<PlanningView />} />
          <Route path="/plan/brainstorm" element={<BrainstormView />} />
          <Route path="/plan/sue" element={<SueChatView />} />
          <Route path="/plan/recommendations" element={<RecommendationsView />} />
          
          {/* Recipe Library - direct access to all recipes */}
          <Route path="/recipes" element={<RecipeLibraryView />} />
          
          {/* Shopping flow */}
          <Route path="/shop" element={<ShoppingView />} />
          <Route path="/shop/:listId" element={<ShoppingView />} />
          
          {/* Cooking flow */}
          <Route path="/cook" element={<CookingView />} />
          <Route path="/cook/prep" element={<MealPrepView />} />
          
          {/* Recipe routes - accessible from anywhere */}
          <Route path="/recipe/new" element={<RecipeEditor />} />
          <Route path="/recipe/import" element={<RecipeImport />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/recipe/:id/cook" element={<CookMode />} />
          <Route path="/recipe/:id/edit" element={<RecipeEditor />} />
          <Route path="/recipe/:id/history" element={<RecipeHistory />} />
          
          {/* Settings and stats */}
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/settings/data" element={<DataManagementView />} />
          <Route path="/stats" element={<StatisticsView />} />
          <Route path="/stats/year/:year" element={<YearInReview />} />
          
          {/* Search - can be modal or page */}
          <Route path="/search" element={<SearchView />} />
          
          {/* Fallback - redirect unknown routes to plan */}
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
