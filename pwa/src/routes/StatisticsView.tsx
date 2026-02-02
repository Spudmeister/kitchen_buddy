/**
 * Statistics View - Personal cooking statistics
 * 
 * Display cooking history and trends with filtering by time period.
 * Requirements: 28.1, 28.2, 28.3, 28.4
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePersonalStats } from '@hooks/useCookSessions';
import { useRecipes } from '@hooks/useRecipes';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import type { StatisticsDateRange } from '../types/statistics';

type TimePeriod = 'all' | 'year' | 'month' | 'week';

/**
 * Get date range for a time period
 */
function getDateRange(period: TimePeriod): StatisticsDateRange | undefined {
  if (period === 'all') return undefined;
  
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  switch (period) {
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
  }
  
  return { start, end };
}

/**
 * Get previous period date range for comparison
 */
function getPreviousPeriodRange(period: TimePeriod): StatisticsDateRange | undefined {
  if (period === 'all') return undefined;
  
  const currentRange = getDateRange(period);
  if (!currentRange) return undefined;
  
  const duration = currentRange.end.getTime() - currentRange.start.getTime();
  const previousEnd = new Date(currentRange.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  
  return { start: previousStart, end: previousEnd };
}

/**
 * Format a number with comparison to previous period
 */
function ComparisonStat({ 
  current, 
  previous, 
  label,
  format = (n: number) => n.toString()
}: { 
  current: number; 
  previous?: number; 
  label: string;
  format?: (n: number) => string;
}) {
  const diff = previous !== undefined ? current - previous : undefined;
  const percentChange = previous !== undefined && previous > 0 
    ? ((current - previous) / previous) * 100 
    : undefined;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {format(current)}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      {diff !== undefined && (
        <div className={`text-xs mt-1 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {diff >= 0 ? '+' : ''}{format(diff)}
          {percentChange !== undefined && ` (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(0)}%)`}
        </div>
      )}
    </div>
  );
}

export default function StatisticsView() {
  const [period, setPeriod] = useState<TimePeriod>('all');
  
  const dateRange = useMemo(() => getDateRange(period), [period]);
  const previousRange = useMemo(() => getPreviousPeriodRange(period), [period]);
  
  const { data: stats, isLoading, error } = usePersonalStats(dateRange);
  const { data: previousStats } = usePersonalStats(previousRange);
  const { data: recipes } = useRecipes();
  
  // Create a map of recipe IDs to recipe names
  const recipeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (recipes) {
      for (const recipe of recipes) {
        map.set(recipe.id, recipe.title);
      }
    }
    return map;
  }, [recipes]);
  
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600 dark:text-red-400">
          Failed to load statistics: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4">
        <div className="text-gray-600 dark:text-gray-400">No statistics available.</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistics</h1>
        <Link 
          to={`/stats/year/${currentYear}`}
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          View {currentYear} in Review →
        </Link>
      </div>

      {/* Time Period Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'year', 'month', 'week'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {p === 'all' ? 'All Time' : p === 'year' ? 'Past Year' : p === 'month' ? 'Past Month' : 'Past Week'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <ComparisonStat
          current={stats.totalRecipes}
          label="Total Recipes"
        />
        <ComparisonStat
          current={stats.totalCookSessions}
          previous={previousStats?.totalCookSessions}
          label="Cook Sessions"
        />
        <ComparisonStat
          current={stats.uniqueRecipesCooked}
          previous={previousStats?.uniqueRecipesCooked}
          label="Unique Recipes Cooked"
        />
        <ComparisonStat
          current={stats.avgCooksPerWeek}
          previous={previousStats?.avgCooksPerWeek}
          label="Avg Cooks/Week"
          format={(n) => n.toFixed(1)}
        />
      </div>

      {/* Most Cooked Recipes */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Most Cooked Recipes
        </h2>
        {stats.mostCookedRecipes.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            No cook sessions recorded yet. Start cooking to see your favorites!
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            {stats.mostCookedRecipes.map((item, index) => (
              <Link
                key={item.recipeId}
                to={`/recipe/${item.recipeId}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-6">{index + 1}</span>
                  <span className="text-gray-900 dark:text-white">
                    {recipeMap.get(item.recipeId) || 'Unknown Recipe'}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {item.count} {item.count === 1 ? 'time' : 'times'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Favorite Tags */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Favorite Tags & Cuisines
        </h2>
        {stats.favoriteTags.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            No tags recorded yet. Add tags to your recipes to see your preferences!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.favoriteTags.map((item) => (
              <div
                key={item.tag}
                className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-sm"
              >
                {item.tag} ({item.count})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {stats.totalCookSessions === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No cooking activity yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Start logging your cook sessions to see your statistics here.
          </p>
          <Link
            to="/cook"
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Start Cooking
          </Link>
        </div>
      )}
    </div>
  );
}
