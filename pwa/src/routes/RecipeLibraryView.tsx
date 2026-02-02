/**
 * Recipe Library View - Browse and manage all recipes
 * 
 * Provides direct access to the recipe collection without going through
 * the planning flow. Includes search, filtering, and sorting.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '@hooks/useRecipes';
import { RecipeCard } from '@components/recipe/RecipeCard';
import { LoadingSpinner } from '@components/ui/LoadingSpinner';
import { SearchIcon, PlusIcon, FunnelIcon, ArrowsUpDownIcon } from '@components/icons';
import type { Recipe } from '../types/recipe';

type SortField = 'name' | 'rating' | 'date_added' | 'cook_time';
type SortDirection = 'asc' | 'desc';

const sortOptions: { field: SortField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'rating', label: 'Rating' },
  { field: 'date_added', label: 'Date Added' },
  { field: 'cook_time', label: 'Cook Time' },
];

export default function RecipeLibraryView() {
  const { data: recipes = [], isLoading } = useRecipes();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get all unique tags from recipes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach((recipe: Recipe) => {
      recipe.tags.forEach((tag: string) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [recipes]);

  // Filter and sort recipes
  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((recipe: Recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.ingredients.some(ing => ing.name.toLowerCase().includes(query)) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      result = result.filter((recipe: Recipe) =>
        selectedTags.every(tag => recipe.tags.includes(tag))
      );
    }

    // Apply sorting
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    result.sort((a: Recipe, b: Recipe) => {
      switch (sortField) {
        case 'name':
          return multiplier * a.title.localeCompare(b.title);
        case 'rating':
          return multiplier * ((a.rating ?? 0) - (b.rating ?? 0));
        case 'date_added':
          return multiplier * (a.createdAt.getTime() - b.createdAt.getTime());
        case 'cook_time':
          const timeA = a.prepTime.minutes + a.cookTime.minutes;
          const timeB = b.prepTime.minutes + b.cookTime.minutes;
          return multiplier * (timeA - timeB);
        default:
          return 0;
      }
    });

    return result;
  }, [recipes, searchQuery, selectedTags, sortField, sortDirection]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Recipes
        </h1>
        <Link
          to="/recipe/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Add Recipe</span>
        </Link>
      </div>

      {/* Search and Controls */}
      <div className="space-y-4 mb-6">
        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showFilters || selectedTags.length > 0
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            <span>Filter</span>
            {selectedTags.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                {selectedTags.length}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              {sortOptions.map(option => (
                <option key={option.field} value={option.field}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleSortDirection}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowsUpDownIcon className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tag Filters */}
        {showFilters && allTags.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recipe Count */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
        {searchQuery || selectedTags.length > 0 ? ' found' : ''}
      </p>

      {/* Recipe Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          {recipes.length === 0 ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No recipes yet. Add your first recipe to get started!
              </p>
              <Link
                to="/recipe/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Add Recipe
              </Link>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No recipes match your search criteria.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
