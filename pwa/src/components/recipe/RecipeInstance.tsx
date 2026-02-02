/**
 * Recipe Instance Component
 *
 * Displays a cook session configuration including:
 * - Scale factor and unit system used
 * - Substitutions made
 * - Photos and notes from the session
 * - "Recreate" button to load exact configuration
 *
 * Requirements: 7.4, 23.4
 */

import { useState, useEffect, useCallback } from 'react';
import type { RecipeInstance, InstanceSubstitution } from '../../types/instance';
import type { Photo } from '../../types/photo';
import { photoStorage } from '../../db/photo-storage';
import {
  ClockIcon,
  ScaleIcon,
  ArrowPathIcon,
  PhotoIcon,
  DocumentTextIcon,
  ArrowsRightLeftIcon,
  ChevronRightIcon,
  BeakerIcon,
} from '../icons';

/**
 * Props for RecipeInstance component
 */
export interface RecipeInstanceProps {
  /** The recipe instance to display */
  instance: RecipeInstance;
  /** Photos associated with this instance */
  photos?: Photo[];
  /** Callback when "Recreate" is clicked - loads exact configuration */
  onRecreate?: (instance: RecipeInstance) => void;
  /** Callback when a photo is clicked */
  onPhotoClick?: (photo: Photo) => void;
  /** Optional class name */
  className?: string;
}

/**
 * Props for RecipeInstanceList component
 */
export interface RecipeInstanceListProps {
  /** Recipe ID */
  recipeId: string;
  /** List of instances to display */
  instances: RecipeInstance[];
  /** Photos grouped by instance ID */
  photosByInstance?: Map<string, Photo[]>;
  /** Callback when an instance is selected */
  onSelectInstance?: (instance: RecipeInstance) => void;
  /** Callback when "Recreate" is clicked */
  onRecreate?: (instance: RecipeInstance) => void;
  /** Optional class name */
  className?: string;
}

/**
 * Format a date to a readable string
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format unit system for display
 */
function formatUnitSystem(system: string): string {
  return system === 'us' ? 'US' : 'Metric';
}

/**
 * Photo thumbnail for instance
 */
function InstancePhotoThumbnail({ 
  photo, 
  onClick 
}: { 
  photo: Photo; 
  onClick?: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    async function loadImage() {
      try {
        setLoading(true);
        objectUrl = await photoStorage.getPhotoAsObjectUrl(photo.id);
        if (mounted && objectUrl) {
          setImageUrl(objectUrl);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photo.id]);

  return (
    <button
      onClick={onClick}
      className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label={photo.metadata.caption || 'View photo'}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
        </div>
      )}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={photo.metadata.caption || 'Cook session photo'}
          className="w-full h-full object-cover"
        />
      )}
    </button>
  );
}

/**
 * Substitution badge component
 */
function SubstitutionBadge({ substitution }: { substitution: InstanceSubstitution }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
      <ArrowsRightLeftIcon className="w-3 h-3" />
      {substitution.originalIngredient} → {substitution.substituteIngredient}
    </span>
  );
}

/**
 * Recipe Instance Component
 * 
 * Displays details of a single cook session configuration
 */
export function RecipeInstance({
  instance,
  photos = [],
  onRecreate,
  onPhotoClick,
  className = '',
}: RecipeInstanceProps) {
  const handleRecreate = useCallback(() => {
    if (onRecreate) {
      onRecreate(instance);
    }
  }, [instance, onRecreate]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
      data-testid={`recipe-instance-${instance.id}`}
    >
      {/* Header with date and recreate button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(instance.createdAt)}
          </span>
        </div>
        {onRecreate && (
          <button
            onClick={handleRecreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            aria-label="Recreate this cook session configuration"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Recreate
          </button>
        )}
      </div>

      {/* Configuration details */}
      <div className="flex flex-wrap gap-3 mb-3">
        {/* Scale factor */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <ScaleIcon className="w-4 h-4" />
          <span>{instance.scaleFactor}x scale</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span>{instance.servings} servings</span>
        </div>

        {/* Unit system */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-medium">
            {formatUnitSystem(instance.unitSystem)}
          </span>
        </div>
      </div>

      {/* Substitutions */}
      {instance.substitutions.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {instance.substitutions.map((sub, index) => (
              <SubstitutionBadge key={index} substitution={sub} />
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {instance.notes && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-start gap-2">
            <DocumentTextIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">{instance.notes}</p>
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <PhotoIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {photos.map((photo) => (
            <InstancePhotoThumbnail
              key={photo.id}
              photo={photo}
              onClick={() => onPhotoClick?.(photo)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Recipe Instance Card - Compact version for lists
 */
export function RecipeInstanceCard({
  instance,
  photoCount = 0,
  onClick,
  onRecreate,
  className = '',
}: {
  instance: RecipeInstance;
  photoCount?: number;
  onClick?: () => void;
  onRecreate?: (instance: RecipeInstance) => void;
  className?: string;
}) {
  const handleRecreate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRecreate) {
      onRecreate(instance);
    }
  }, [instance, onRecreate]);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-primary-300 dark:hover:border-primary-600 transition-colors ${className}`}
      data-testid={`recipe-instance-card-${instance.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Date */}
          <div className="flex items-center gap-2 mb-1">
            <ClockIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDate(instance.createdAt)}
            </span>
          </div>

          {/* Config summary */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{instance.scaleFactor}x</span>
            <span>•</span>
            <span>{instance.servings} servings</span>
            <span>•</span>
            <span>{formatUnitSystem(instance.unitSystem)}</span>
            {instance.substitutions.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ArrowsRightLeftIcon className="w-3 h-3" />
                  {instance.substitutions.length} sub{instance.substitutions.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
            {photoCount > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <PhotoIcon className="w-3 h-3" />
                  {photoCount}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2">
          {onRecreate && (
            <button
              onClick={handleRecreate}
              className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              aria-label="Recreate this configuration"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          )}
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </button>
  );
}

/**
 * Recipe Instance List Component
 * 
 * Displays a list of cook session instances for a recipe
 */
export function RecipeInstanceList({
  recipeId: _recipeId,
  instances,
  photosByInstance,
  onSelectInstance,
  onRecreate,
  className = '',
}: RecipeInstanceListProps) {
  if (instances.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <BeakerIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No cook sessions yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Start cooking to track your sessions
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {instances.map((instance) => {
        const photos = photosByInstance?.get(instance.id) || [];
        return (
          <RecipeInstanceCard
            key={instance.id}
            instance={instance}
            photoCount={photos.length}
            onClick={() => onSelectInstance?.(instance)}
            onRecreate={onRecreate}
          />
        );
      })}
    </div>
  );
}
