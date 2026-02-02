/**
 * Recipe Detail Component
 *
 * Full recipe view with all capabilities including:
 * - Display: title, photos, description, times, servings, rating, tags
 * - Ingredients list with quantities and units
 * - Numbered instruction steps
 * - Cook statistics when available
 * - Scaling and unit conversion
 * - Ingredient substitutions
 * - Cook session instances
 * - Recipe meta statistics
 * - Log a cook session without Cook Mode
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.4, 9.1, 9.5, 23.5
 */

import { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Recipe, Ingredient, Instruction } from '../../types/recipe';
import type { Duration, UnitSystem } from '../../types/units';
import type { Substitution } from '../../types/substitution';
import type { RecipeInstance } from '../../types/instance';
import type { Photo } from '../../types/photo';
import { scaleIngredients, convertIngredientsToSystem } from '../../services/scaling-service';
import { getSubstitutions, hasSubstitutions } from '../../services/substitution-service';
import { useUIStore } from '../../stores/ui-store';
import { ScaleControl } from '../ui/ScaleControl';
import { UnitToggle } from '../ui/UnitToggle';
import { SubstitutionPanel } from './SubstitutionPanel';
import { RecipeInstanceList } from './RecipeInstance';
import { RecipeMeta, type RatingEntry } from './RecipeMeta';
import { RecipeExportModal } from './RecipeExportModal';
import { CookSessionLog } from '../cooking';
import {
  ClockIcon,
  StarIcon,
  TagIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ArrowsRightLeftIcon,
  BeakerIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
} from '../icons';

/**
 * Cook statistics for a recipe
 */
export interface CookStats {
  timesCooked: number;
  lastCooked?: Date;
  avgPrepTime?: Duration;
  avgCookTime?: Duration;
  minPrepTime?: Duration;
  maxPrepTime?: Duration;
  minCookTime?: Duration;
  maxCookTime?: Duration;
}

/**
 * Recipe Detail props
 */
export interface RecipeDetailProps {
  recipe: Recipe;
  cookStats?: CookStats;
  /** Cook session instances for this recipe */
  instances?: RecipeInstance[];
  /** Photos grouped by instance ID */
  photosByInstance?: Map<string, Photo[]>;
  /** Rating history for this recipe */
  ratingHistory?: RatingEntry[];
  /** Initial scale (servings) - defaults to recipe.servings */
  initialScale?: number;
  /** Initial unit system - defaults to user preference */
  initialUnitSystem?: UnitSystem;
  onCookNow?: () => void;
  onAddToMenu?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onBack?: () => void;
  /** Callback when an instance is selected */
  onSelectInstance?: (instance: RecipeInstance) => void;
  /** Callback when "Recreate" is clicked on an instance */
  onRecreateInstance?: (instance: RecipeInstance) => void;
  className?: string;
}

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(duration: Duration): string {
  const minutes = duration.minutes;
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format a date to relative or absolute string
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}

/**
 * Format unit for display
 */
function formatUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    cup: 'cup',
    tbsp: 'tbsp',
    tsp: 'tsp',
    fl_oz: 'fl oz',
    pint: 'pint',
    quart: 'quart',
    gallon: 'gallon',
    ml: 'ml',
    l: 'L',
    oz: 'oz',
    lb: 'lb',
    g: 'g',
    kg: 'kg',
    piece: '',
    dozen: 'dozen',
    pinch: 'pinch',
    dash: 'dash',
    to_taste: 'to taste',
  };
  return unitMap[unit] ?? unit;
}

/**
 * Format quantity for display (handle fractions)
 */
function formatQuantity(quantity: number): string {
  if (quantity === 0) return '';

  // Handle common fractions
  const fractions: Record<number, string> = {
    0.25: '¼',
    0.33: '⅓',
    0.5: '½',
    0.67: '⅔',
    0.75: '¾',
  };

  const whole = Math.floor(quantity);
  const decimal = quantity - whole;

  // Check for common fractions
  for (const [value, symbol] of Object.entries(fractions)) {
    if (Math.abs(decimal - parseFloat(value)) < 0.05) {
      return whole > 0 ? `${whole} ${symbol}` : symbol;
    }
  }

  // Round to reasonable precision
  if (decimal === 0) return whole.toString();
  return quantity.toFixed(quantity < 10 ? 1 : 0);
}

/**
 * Star Rating Display Component
 */
function StarRating({ rating, size = 'md' }: { rating?: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <StarIcon
        key={i}
        className={`${sizeClass} ${
          rating && i <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
        }`}
        filled={rating !== undefined && i <= rating}
      />
    );
  }

  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={rating ? `${rating} out of 5 stars` : 'Not rated'}
    >
      {stars}
    </div>
  );
}

/**
 * Ingredient Item Component
 */
function IngredientItem({ 
  ingredient, 
  hasSubstitution,
  selectedSubstitution,
  onSubstitutionClick,
}: { 
  ingredient: Ingredient;
  hasSubstitution: boolean;
  selectedSubstitution?: Substitution;
  onSubstitutionClick: () => void;
}) {
  const quantity = formatQuantity(ingredient.quantity);
  const unit = formatUnit(ingredient.unit);

  // If a substitution is selected, show the substitute name
  const displayName = selectedSubstitution 
    ? selectedSubstitution.substitute 
    : ingredient.name;
  
  // If a substitution is selected, adjust the quantity based on ratio
  const displayQuantity = selectedSubstitution
    ? formatQuantity(ingredient.quantity * selectedSubstitution.ratio)
    : quantity;
  
  // If a substitution has a different unit, use that
  const displayUnit = selectedSubstitution?.unit 
    ? formatUnit(selectedSubstitution.unit) 
    : unit;

  return (
    <li className="flex items-start gap-2 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="w-20 flex-shrink-0 text-right font-medium text-gray-900 dark:text-white">
        {displayQuantity} {displayUnit}
      </span>
      <span className="flex-1 text-gray-700 dark:text-gray-300">
        <span className={selectedSubstitution ? 'text-primary-600 dark:text-primary-400' : ''}>
          {displayName}
        </span>
        {selectedSubstitution && (
          <span className="text-gray-400 dark:text-gray-500 text-sm ml-1">
            (instead of {ingredient.name})
          </span>
        )}
        {ingredient.notes && !selectedSubstitution && (
          <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">({ingredient.notes})</span>
        )}
      </span>
      {hasSubstitution && (
        <button
          onClick={onSubstitutionClick}
          className={`flex-shrink-0 p-1 rounded-full transition-colors ${
            selectedSubstitution
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500'
          }`}
          aria-label={`View substitutions for ${ingredient.name}`}
          data-testid={`substitution-indicator-${ingredient.id}`}
        >
          <ArrowsRightLeftIcon className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

/**
 * Instruction Step Component
 */
function InstructionStep({ instruction, stepNumber }: { instruction: Instruction; stepNumber: number }) {
  return (
    <li className="flex gap-4 py-3">
      <span
        className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center font-semibold text-sm"
        aria-hidden="true"
      >
        {stepNumber}
      </span>
      <div className="flex-1 pt-1">
        <p className="text-gray-700 dark:text-gray-300">{instruction.text}</p>
        {instruction.duration && (
          <span className="inline-flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-4 h-4" />
            {formatDuration(instruction.duration)}
          </span>
        )}
        {instruction.notes && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">{instruction.notes}</p>
        )}
      </div>
    </li>
  );
}

/**
 * Cook Statistics Section Component
 */
function CookStatsSection({ stats }: { stats: CookStats }) {
  return (
    <section
      className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4"
      aria-labelledby="cook-stats-heading"
    >
      <h3
        id="cook-stats-heading"
        className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-3"
      >
        <ChartBarIcon className="w-5 h-5" />
        Cook Statistics
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-gray-500 dark:text-gray-400">Times Cooked</dt>
          <dd className="text-lg font-semibold text-gray-900 dark:text-white">{stats.timesCooked}</dd>
        </div>
        {stats.lastCooked && (
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Last Cooked</dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(stats.lastCooked)}
            </dd>
          </div>
        )}
        {stats.avgPrepTime && (
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Avg Prep Time</dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDuration(stats.avgPrepTime)}
            </dd>
          </div>
        )}
        {stats.avgCookTime && (
          <div>
            <dt className="text-sm text-gray-500 dark:text-gray-400">Avg Cook Time</dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDuration(stats.avgCookTime)}
            </dd>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Recipe Detail Component
 */
export function RecipeDetail({
  recipe,
  cookStats,
  instances = [],
  photosByInstance,
  ratingHistory = [],
  initialScale,
  initialUnitSystem,
  onCookNow,
  onAddToMenu,
  onShare,
  onEdit,
  onDuplicate,
  onBack,
  onSelectInstance,
  onRecreateInstance,
  className = '',
}: RecipeDetailProps) {
  const navigate = useNavigate();
  const { preferences, updatePreferences } = useUIStore();

  // Scaling state - persists for session
  const [currentServings, setCurrentServings] = useState(
    initialScale ?? recipe.servings
  );

  // Unit system state - uses user preference as default
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(
    initialUnitSystem ?? preferences.unitSystem
  );

  // Substitution state
  const [substitutionPanelOpen, setSubstitutionPanelOpen] = useState(false);
  const [selectedIngredientForSubstitution, setSelectedIngredientForSubstitution] = useState<Ingredient | null>(null);
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<Map<string, Substitution>>(new Map());

  // Section visibility state
  const [showInstances, setShowInstances] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  
  // Log a Cook modal state - Requirements: 23.5
  const [showLogCookModal, setShowLogCookModal] = useState(false);
  
  // Export modal state - Requirements: 31.1, 31.2, 31.3
  const [showExportModal, setShowExportModal] = useState(false);

  // Calculate scale factor
  const scaleFactor = recipe.servings > 0 ? currentServings / recipe.servings : 1;

  // Compute scaled and converted ingredients
  const displayIngredients = useMemo(() => {
    // First scale the ingredients
    const scaled = scaleIngredients(recipe.ingredients, scaleFactor);
    // Then convert to the selected unit system
    return convertIngredientsToSystem(scaled, unitSystem);
  }, [recipe.ingredients, scaleFactor, unitSystem]);

  // Get substitutions for the selected ingredient
  const currentSubstitutions = useMemo(() => {
    if (!selectedIngredientForSubstitution) return [];
    return getSubstitutions(selectedIngredientForSubstitution.name);
  }, [selectedIngredientForSubstitution]);

  // Handle unit system change - also persist to preferences
  const handleUnitSystemChange = useCallback((system: UnitSystem) => {
    setUnitSystem(system);
    updatePreferences({ unitSystem: system });
  }, [updatePreferences]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  }, [onBack, navigate]);

  const handleCookNow = useCallback(() => {
    if (onCookNow) {
      onCookNow();
    } else {
      navigate(`/recipe/${recipe.id}/cook`);
    }
  }, [onCookNow, navigate, recipe.id]);

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit();
    } else {
      navigate(`/recipe/${recipe.id}/edit`);
    }
  }, [onEdit, navigate, recipe.id]);

  // Handle opening Log a Cook modal - Requirements: 23.5
  const handleLogCook = useCallback(() => {
    setShowLogCookModal(true);
  }, []);

  // Handle closing Log a Cook modal
  const handleLogCookComplete = useCallback(() => {
    setShowLogCookModal(false);
  }, []);

  // Handle opening substitution panel for an ingredient
  const handleOpenSubstitutionPanel = useCallback((ingredient: Ingredient) => {
    setSelectedIngredientForSubstitution(ingredient);
    setSubstitutionPanelOpen(true);
  }, []);

  // Handle closing substitution panel
  const handleCloseSubstitutionPanel = useCallback(() => {
    setSubstitutionPanelOpen(false);
    setSelectedIngredientForSubstitution(null);
  }, []);

  // Handle selecting a substitution
  const handleSelectSubstitution = useCallback((substitution: Substitution) => {
    if (!selectedIngredientForSubstitution) return;
    
    setSelectedSubstitutions(prev => {
      const next = new Map(prev);
      // If the same substitution is selected, toggle it off
      const current = next.get(selectedIngredientForSubstitution.id);
      if (current?.substitute === substitution.substitute) {
        next.delete(selectedIngredientForSubstitution.id);
      } else {
        next.set(selectedIngredientForSubstitution.id, substitution);
      }
      return next;
    });
  }, [selectedIngredientForSubstitution]);

  return (
    <article
      className={`bg-white dark:bg-gray-900 ${className}`}
      aria-labelledby="recipe-title"
    >
      {/* Header with back button */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 p-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <h1
            id="recipe-title"
            className="flex-1 text-xl font-bold text-gray-900 dark:text-white truncate"
          >
            {recipe.title}
          </h1>
        </div>
      </header>

      {/* Photo placeholder */}
      <div className="aspect-video bg-gray-200 dark:bg-gray-800">
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <span className="text-6xl">🍽️</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCookNow}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            aria-label="Start cooking this recipe"
          >
            <PlayIcon className="w-5 h-5" />
            Cook Now
          </button>
          {/* Log a Cook - Requirements: 23.5 */}
          <button
            onClick={handleLogCook}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Log a cook session for this recipe"
          >
            <DocumentTextIcon className="w-5 h-5" />
            Log a Cook
          </button>
          {onAddToMenu && (
            <button
              onClick={onAddToMenu}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Add recipe to menu"
            >
              <PlusIcon className="w-5 h-5" />
              Add to Menu
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Share recipe"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleEdit}
            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Edit recipe"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Duplicate recipe"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>
          )}
          {/* Export button - Requirements: 31.1, 31.2, 31.3 */}
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Export recipe"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <ClockIcon className="w-5 h-5" />
            <span>
              {formatDuration(recipe.prepTime)} prep + {formatDuration(recipe.cookTime)} cook
            </span>
          </span>
        </div>

        {/* Scaling and Unit Controls */}
        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-gray-200 dark:border-gray-700">
          <ScaleControl
            baseServings={recipe.servings}
            currentServings={currentServings}
            onChange={setCurrentServings}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Units:</span>
            <UnitToggle
              currentSystem={unitSystem}
              onChange={handleUnitSystemChange}
              size="sm"
            />
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <StarRating rating={recipe.rating} size="lg" />
          {recipe.rating && (
            <span className="text-gray-600 dark:text-gray-400">({recipe.rating}/5)</span>
          )}
        </div>

        {/* Description */}
        {recipe.description && (
          <p className="text-gray-700 dark:text-gray-300">{recipe.description}</p>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2" role="list" aria-label="Recipe tags">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                role="listitem"
                className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <TagIcon className="w-3.5 h-3.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Cook Statistics */}
        {cookStats && cookStats.timesCooked > 0 && <CookStatsSection stats={cookStats} />}

        {/* Ingredients */}
        <section aria-labelledby="ingredients-heading">
          <h2
            id="ingredients-heading"
            className="text-lg font-semibold text-gray-900 dark:text-white mb-3"
          >
            Ingredients
          </h2>
          <ul className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4">
            {displayIngredients.map((ingredient) => (
              <IngredientItem 
                key={ingredient.id} 
                ingredient={ingredient}
                hasSubstitution={hasSubstitutions(ingredient.name)}
                selectedSubstitution={selectedSubstitutions.get(ingredient.id)}
                onSubstitutionClick={() => handleOpenSubstitutionPanel(ingredient)}
              />
            ))}
          </ul>
        </section>

        {/* Instructions */}
        <section aria-labelledby="instructions-heading">
          <h2
            id="instructions-heading"
            className="text-lg font-semibold text-gray-900 dark:text-white mb-3"
          >
            Instructions
          </h2>
          <ol className="space-y-2" aria-label="Recipe instructions">
            {recipe.instructions.map((instruction, index) => (
              <InstructionStep
                key={instruction.id}
                instruction={instruction}
                stepNumber={index + 1}
              />
            ))}
          </ol>
        </section>

        {/* Cook Sessions / Instances Section */}
        {instances.length > 0 && (
          <section aria-labelledby="instances-heading">
            <button
              onClick={() => setShowInstances(!showInstances)}
              className="w-full flex items-center justify-between py-3 text-left"
              aria-expanded={showInstances}
            >
              <h2
                id="instances-heading"
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
              >
                <BeakerIcon className="w-5 h-5" />
                Cook Sessions
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({instances.length})
                </span>
              </h2>
              <ChevronLeftIcon
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  showInstances ? '-rotate-90' : 'rotate-180'
                }`}
              />
            </button>
            {showInstances && (
              <RecipeInstanceList
                recipeId={recipe.id}
                instances={instances}
                photosByInstance={photosByInstance}
                onSelectInstance={onSelectInstance}
                onRecreate={onRecreateInstance}
                className="mt-2"
              />
            )}
          </section>
        )}

        {/* Recipe Meta / Statistics Section */}
        {(cookStats?.timesCooked ?? 0) > 0 || ratingHistory.length > 0 ? (
          <section aria-labelledby="meta-heading">
            <button
              onClick={() => setShowMeta(!showMeta)}
              className="w-full flex items-center justify-between py-3 text-left"
              aria-expanded={showMeta}
            >
              <h2
                id="meta-heading"
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
              >
                <ChartBarIcon className="w-5 h-5" />
                Detailed Statistics
              </h2>
              <ChevronLeftIcon
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  showMeta ? '-rotate-90' : 'rotate-180'
                }`}
              />
            </button>
            {showMeta && cookStats && (
              <RecipeMeta
                recipeId={recipe.id}
                stats={cookStats}
                ratingHistory={ratingHistory}
                estimatedPrepTime={recipe.prepTime}
                estimatedCookTime={recipe.cookTime}
                className="mt-2"
              />
            )}
          </section>
        ) : null}

        {/* Source URL */}
        {recipe.sourceUrl && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
            >
              View original recipe →
            </a>
          </div>
        )}
      </div>

      {/* Substitution Panel */}
      {selectedIngredientForSubstitution && (
        <SubstitutionPanel
          ingredient={selectedIngredientForSubstitution}
          substitutions={currentSubstitutions}
          selectedSubstitution={selectedSubstitutions.get(selectedIngredientForSubstitution.id)}
          onSelect={handleSelectSubstitution}
          onClose={handleCloseSubstitutionPanel}
          isOpen={substitutionPanelOpen}
        />
      )}

      {/* Log a Cook Modal - Requirements: 23.5 */}
      {showLogCookModal && (
        <CookSessionLog
          recipe={recipe}
          onComplete={handleLogCookComplete}
          onClose={handleLogCookComplete}
          isPostCookMode={false}
        />
      )}

      {/* Export Modal - Requirements: 31.1, 31.2, 31.3 */}
      <RecipeExportModal
        recipe={recipe}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </article>
  );
}
