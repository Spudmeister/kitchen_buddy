/**
 * Cook Mode - Distraction-free cooking experience
 *
 * Step-by-step cooking interface with:
 * - Large text, one step at a time
 * - Swipe navigation between steps
 * - Wake lock (screen stays on)
 * - Relevant ingredients for current step
 * - Camera capture for photos
 * - Session logging prompt when complete
 *
 * Requirements: 22.1, 22.3, 22.4, 22.5, 22.8, 23.1
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useRecipe } from '../hooks/useRecipes';
import { useUIStore } from '../stores/ui-store';
import { scaleIngredients, convertIngredientsToSystem } from '../services/scaling-service';
import { PhotoCaptureButton } from '../components/recipe/PhotoCapture';
import { CookSessionLog } from '../components/cooking';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ClockIcon,
  ListBulletIcon,
  CheckIcon,
} from '../components/icons';
import type { Ingredient, Instruction } from '../types/recipe';
import type { UnitSystem } from '../types/units';
import type { Photo } from '../types/photo';
import type { Substitution } from '../types/substitution';
import type { InstanceConfig } from '../types/instance';
import { getSubstitutions, hasSubstitutions } from '../services/substitution-service';

/**
 * Format quantity for display
 */
function formatQuantity(quantity: number): string {
  if (quantity === 0) return '';

  // Handle common fractions
  const fractions: Record<number, string> = {
    0.125: '⅛',
    0.25: '¼',
    0.333: '⅓',
    0.5: '½',
    0.667: '⅔',
    0.75: '¾',
  };

  const wholePart = Math.floor(quantity);
  const fractionalPart = quantity - wholePart;

  // Find closest fraction
  let closestFraction = '';
  let minDiff = 0.1;
  for (const [value, symbol] of Object.entries(fractions)) {
    const diff = Math.abs(fractionalPart - parseFloat(value));
    if (diff < minDiff) {
      minDiff = diff;
      closestFraction = symbol;
    }
  }

  if (wholePart === 0 && closestFraction) {
    return closestFraction;
  }
  if (closestFraction) {
    return `${wholePart}${closestFraction}`;
  }
  if (Number.isInteger(quantity)) {
    return quantity.toString();
  }
  return quantity.toFixed(1);
}

/**
 * Format unit for display
 */
function formatUnit(unit: string): string {
  const unitLabels: Record<string, string> = {
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
  return unitLabels[unit] ?? unit;
}

/**
 * Extract ingredient references from instruction text
 * Looks for ingredient names mentioned in the step
 */
function extractRelevantIngredients(
  instruction: Instruction,
  ingredients: Ingredient[]
): Ingredient[] {
  const text = instruction.text.toLowerCase();
  return ingredients.filter((ing) => {
    const name = ing.name.toLowerCase();
    // Check if ingredient name appears in instruction
    return text.includes(name) || name.split(' ').some((word) => word.length > 3 && text.includes(word));
  });
}

/**
 * Parse timer duration from instruction text
 * Returns duration in seconds if found, null otherwise
 */
function parseTimerFromInstruction(text: string): number | null {
  // Match patterns like "5 minutes", "30 seconds", "1 hour", "2-3 minutes"
  const patterns = [
    /(\d+)\s*-?\s*(\d+)?\s*(minute|min|minutes|mins)/i,
    /(\d+)\s*-?\s*(\d+)?\s*(second|sec|seconds|secs)/i,
    /(\d+)\s*-?\s*(\d+)?\s*(hour|hr|hours|hrs)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1]!, 10);
      const unit = match[3]!.toLowerCase();

      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        return value * 3600;
      }
      if (unit.startsWith('minute') || unit.startsWith('min')) {
        return value * 60;
      }
      if (unit.startsWith('second') || unit.startsWith('sec')) {
        return value;
      }
    }
  }

  return null;
}

/**
 * Ingredient Chip Component
 */
function IngredientChip({ ingredient }: { ingredient: Ingredient }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm">
      <span className="font-medium">
        {formatQuantity(ingredient.quantity)} {formatUnit(ingredient.unit)}
      </span>
      <span>{ingredient.name}</span>
    </div>
  );
}

/**
 * Step Navigation Dots
 */
function StepDots({
  total,
  current,
  completedSteps,
  onStepClick,
}: {
  total: number;
  current: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onStepClick(i)}
          className={`w-3 h-3 rounded-full transition-all ${
            i === current
              ? 'bg-primary-600 scale-125'
              : completedSteps.has(i)
              ? 'bg-green-500'
              : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
          }`}
          aria-label={`Go to step ${i + 1}${completedSteps.has(i) ? ' (completed)' : ''}`}
        />
      ))}
    </div>
  );
}

/**
 * Timer Display Component
 */
function TimerDisplay({
  duration,
  onStart,
}: {
  duration: number;
  onStart: () => void;
}) {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <button
      onClick={onStart}
      className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
    >
      <ClockIcon className="w-5 h-5" />
      <span className="font-medium">
        Start {minutes > 0 ? `${minutes}m` : ''}{seconds > 0 ? `${seconds}s` : ''} timer
      </span>
    </button>
  );
}

/**
 * Active Timer Component
 */
function ActiveTimer({
  initialDuration,
  onComplete,
  onCancel,
}: {
  initialDuration: number;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [remaining, setRemaining] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-amber-500 text-white rounded-xl p-4 shadow-lg z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClockIcon className="w-6 h-6" />
          <span className="text-2xl font-bold tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="p-2 hover:bg-amber-600 rounded-lg transition-colors"
            aria-label={isRunning ? 'Pause timer' : 'Resume timer'}
          >
            {isRunning ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-amber-600 rounded-lg transition-colors"
            aria-label="Cancel timer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Ingredients Panel with Substitution Support
 * Requirements: 22.7 - Button to view all ingredients, access substitutions
 */
function IngredientsPanel({
  ingredients,
  onClose,
}: {
  ingredients: Ingredient[];
  onClose: () => void;
}) {
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);

  const handleIngredientClick = useCallback((ingredient: Ingredient) => {
    if (hasSubstitutions(ingredient.name)) {
      setSelectedIngredient(ingredient);
      setSubstitutions(getSubstitutions(ingredient.name));
    }
  }, []);

  const handleCloseSubstitutions = useCallback(() => {
    setSelectedIngredient(null);
    setSubstitutions([]);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Ingredients</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close ingredients panel"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
          <ul className="space-y-3">
            {ingredients.map((ing) => {
              const hasSubs = hasSubstitutions(ing.name);
              return (
                <li
                  key={ing.id}
                  className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${
                    hasSubs ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                  }`}
                  onClick={() => handleIngredientClick(ing)}
                >
                  <span className="font-medium text-gray-900 dark:text-white min-w-[60px]">
                    {formatQuantity(ing.quantity)} {formatUnit(ing.unit)}
                  </span>
                  <span className="flex-1 text-gray-700 dark:text-gray-300">{ing.name}</span>
                  {ing.notes && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">({ing.notes})</span>
                  )}
                  {hasSubs && (
                    <span className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
                      Subs
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Substitution sub-panel */}
        {selectedIngredient && substitutions.length > 0 && (
          <div className="absolute inset-0 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCloseSubstitutions}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Back to ingredients"
              >
                <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Substitutes for {selectedIngredient.name}
              </h2>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
              <ul className="space-y-3">
                {substitutions.map((sub, index) => (
                  <li
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {sub.substitute}
                      </span>
                      <span className="text-sm px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                        {sub.ratio}x ratio
                      </span>
                    </div>
                    {sub.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {sub.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Cook Mode Props from URL params
 */
interface CookModeConfig {
  scale: number;
  unitSystem: UnitSystem;
}

/**
 * Cook Mode Component
 */
export default function CookMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: recipe, isLoading } = useRecipe(id);
  const preferences = useUIStore((state) => state.preferences);
  const showToast = useUIStore((state) => state.showToast);

  // Parse config from URL params or use defaults
  const config: CookModeConfig = useMemo(() => ({
    scale: parseFloat(searchParams.get('scale') ?? '1'),
    unitSystem: (searchParams.get('units') as UnitSystem) ?? preferences.unitSystem,
  }), [searchParams, preferences.unitSystem]);

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showIngredients, setShowIngredients] = useState(false);
  const [showSessionLog, setShowSessionLog] = useState(false);
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [_sessionPhotos, setSessionPhotos] = useState<Photo[]>([]);
  const [sessionId] = useState(() => uuidv4()); // Unique ID for this cooking session
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build instance config for session logging
  const instanceConfig: InstanceConfig = useMemo(() => ({
    scaleFactor: config.scale,
    unitSystem: config.unitSystem,
    servings: recipe ? Math.round(recipe.servings * config.scale) : undefined,
  }), [config.scale, config.unitSystem, recipe]);

  // Process ingredients with scaling and unit conversion
  const processedIngredients = useMemo(() => {
    if (!recipe) return [];
    const scaled = scaleIngredients(recipe.ingredients, config.scale);
    return convertIngredientsToSystem(scaled, config.unitSystem);
  }, [recipe, config.scale, config.unitSystem]);

  // Get current instruction
  const currentInstruction = recipe?.instructions[currentStep];
  const totalSteps = recipe?.instructions.length ?? 0;

  // Get relevant ingredients for current step
  const relevantIngredients = useMemo(() => {
    if (!currentInstruction || !processedIngredients.length) return [];
    return extractRelevantIngredients(currentInstruction, processedIngredients);
  }, [currentInstruction, processedIngredients]);

  // Check for timer in current step
  const timerDuration = useMemo(() => {
    if (!currentInstruction) return null;
    return parseTimerFromInstruction(currentInstruction.text);
  }, [currentInstruction]);

  // Wake Lock API
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        // Wake lock not supported or denied
        console.log('Wake lock not available:', err);
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  // Navigation handlers
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const markComplete = useCallback(() => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps complete - show session logging prompt
      // Requirements: 23.1 - WHEN Cook_Mode ends THEN a logging prompt SHALL appear
      showToast({ type: 'success', message: 'Great job! Recipe complete!' });
      setShowSessionLog(true);
    }
  }, [currentStep, totalSteps, showToast]);

  // Handle session log completion
  const handleSessionLogComplete = useCallback(() => {
    setShowSessionLog(false);
    navigate(-1);
  }, [navigate]);

  // Handle session log close (skip)
  const handleSessionLogClose = useCallback(() => {
    setShowSessionLog(false);
    navigate(-1);
  }, [navigate]);

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0]?.clientX ?? 0;
    const diff = touchStartX.current - touchEndX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goNext();
      } else {
        goPrev();
      }
    }

    touchStartX.current = null;
  }, [goNext, goPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, navigate]);

  // Timer handlers
  const handleStartTimer = useCallback(() => {
    if (timerDuration) {
      setActiveTimer(timerDuration);
    }
  }, [timerDuration]);

  const handleTimerComplete = useCallback(() => {
    setActiveTimer(null);
    showToast({ type: 'info', message: 'Timer complete!' });
    // Play sound or vibrate if available
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }, [showToast]);

  // Photo capture handler
  const handlePhotoAdded = useCallback((photo: Photo) => {
    setSessionPhotos((prev) => [...prev, photo]);
    showToast({ type: 'success', message: 'Photo saved!' });
  }, [showToast]);

  // Exit handler
  const handleExit = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-500" />
      </div>
    );
  }

  if (!recipe || !currentInstruction) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Recipe not found</h1>
          <button
            onClick={() => navigate('/cook')}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Back to cooking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white dark:bg-gray-900 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleExit}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Exit cook mode"
        >
          <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="text-center">
          <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
            {recipe.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Step {currentStep + 1} of {totalSteps}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Camera button for capturing photos */}
          <PhotoCaptureButton
            recipeId={recipe.id}
            instanceId={sessionId}
            onPhotoAdded={handlePhotoAdded}
          />
          <button
            onClick={() => setShowIngredients(true)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="View all ingredients"
          >
            <ListBulletIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* Step dots */}
        <div className="mb-6">
          <StepDots
            total={totalSteps}
            current={currentStep}
            completedSteps={completedSteps}
            onStepClick={goToStep}
          />
        </div>

        {/* Instruction text */}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-2xl md:text-3xl lg:text-4xl text-center text-gray-900 dark:text-white leading-relaxed font-medium">
            {currentInstruction.text}
          </p>
        </div>

        {/* Relevant ingredients */}
        {relevantIngredients.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">
              Ingredients for this step
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {relevantIngredients.map((ing) => (
                <IngredientChip key={ing.id} ingredient={ing} />
              ))}
            </div>
          </div>
        )}

        {/* Timer button */}
        {timerDuration && !activeTimer && (
          <div className="mt-6 flex justify-center">
            <TimerDisplay duration={timerDuration} onStart={handleStartTimer} />
          </div>
        )}
      </main>

      {/* Navigation footer */}
      <footer className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous step"
          >
            <ChevronLeftIcon className="w-6 h-6" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <button
            onClick={markComplete}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            aria-label={currentStep === totalSteps - 1 ? 'Finish cooking' : 'Mark step complete'}
          >
            <CheckIcon className="w-5 h-5" />
            <span>{currentStep === totalSteps - 1 ? 'Finish' : 'Done'}</span>
          </button>

          <button
            onClick={goNext}
            disabled={currentStep === totalSteps - 1}
            className="flex items-center gap-2 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next step"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        </div>
      </footer>

      {/* Active timer */}
      {activeTimer !== null && (
        <ActiveTimer
          initialDuration={activeTimer}
          onComplete={handleTimerComplete}
          onCancel={() => setActiveTimer(null)}
        />
      )}

      {/* Ingredients panel (slide-over) */}
      {showIngredients && (
        <IngredientsPanel
          ingredients={processedIngredients}
          onClose={() => setShowIngredients(false)}
        />
      )}

      {/* Session logging prompt - Requirements: 23.1 */}
      {showSessionLog && recipe && (
        <CookSessionLog
          recipe={recipe}
          config={instanceConfig}
          onComplete={handleSessionLogComplete}
          onClose={handleSessionLogClose}
          isPostCookMode={true}
        />
      )}
    </div>
  );
}
