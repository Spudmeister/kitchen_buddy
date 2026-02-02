/**
 * Photo Gallery Component
 *
 * Displays recipe photos in a grid/carousel layout.
 * Supports grouping by cook session and full-size viewing.
 *
 * Requirements: 7.1, 7.4, 7.5
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Photo, PhotoGroup } from '../../types/photo';
import { photoStorage } from '../../db/photo-storage';
import { PhotoIcon, XMarkIcon, ChevronLeftIcon } from '../icons';

/**
 * Props for PhotoGallery
 */
export interface PhotoGalleryProps {
  /** Recipe ID */
  recipeId: string;
  /** Photos to display */
  photos: Photo[];
  /** Whether to group photos by cook session */
  groupBySession?: boolean;
  /** Callback when a photo's session is tapped */
  onSessionTap?: (instanceId: string) => void;
  /** Optional class name */
  className?: string;
}

/**
 * Props for PhotoThumbnail
 */
interface PhotoThumbnailProps {
  photo: Photo;
  onClick: () => void;
}

/**
 * Photo thumbnail component
 */
function PhotoThumbnail({ photo, onClick }: PhotoThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    async function loadImage() {
      try {
        setLoading(true);
        setError(false);
        objectUrl = await photoStorage.getPhotoAsObjectUrl(photo.id);
        if (mounted && objectUrl) {
          setImageUrl(objectUrl);
        }
      } catch {
        if (mounted) {
          setError(true);
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
      className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label={photo.metadata.caption || `Photo from ${photo.createdAt.toLocaleDateString()}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <PhotoIcon className="h-8 w-8" />
        </div>
      )}
      {imageUrl && !error && (
        <img
          src={imageUrl}
          alt={photo.metadata.caption || 'Recipe photo'}
          className="h-full w-full object-cover transition-transform hover:scale-105"
          loading="lazy"
        />
      )}
    </button>
  );
}


/**
 * Full-size photo viewer (lightbox)
 */
interface PhotoViewerProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onSessionTap?: (instanceId: string) => void;
}

function PhotoViewer({ photos, initialIndex, onClose, onSessionTap }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    async function loadImage() {
      try {
        setLoading(true);
        objectUrl = await photoStorage.getPhotoAsObjectUrl(currentPhoto.id);
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
  }, [currentPhoto.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, photos.length, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, photos.length]);

  const handleSessionTap = useCallback(() => {
    if (currentPhoto.instanceId && onSessionTap) {
      onSessionTap(currentPhoto.instanceId);
      onClose();
    }
  }, [currentPhoto.instanceId, onSessionTap, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          className="rounded-full p-2 text-white hover:bg-white/10"
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <span className="text-sm text-white/70">
          {currentIndex + 1} / {photos.length}
        </span>
        {currentPhoto.instanceId && onSessionTap && (
          <button
            onClick={handleSessionTap}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            View Session
          </button>
        )}
        {!currentPhoto.instanceId && <div className="w-20" />}
      </div>

      {/* Image */}
      <div className="relative flex flex-1 items-center justify-center">
        {loading && (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={currentPhoto.metadata.caption || 'Recipe photo'}
            className="max-h-full max-w-full object-contain"
          />
        )}

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrevious}
            className="absolute left-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 md:left-4"
            aria-label="Previous photo"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        )}
        {currentIndex < photos.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 md:right-4"
            aria-label="Next photo"
          >
            <ChevronLeftIcon className="h-6 w-6 rotate-180" />
          </button>
        )}
      </div>

      {/* Caption */}
      {currentPhoto.metadata.caption && (
        <div className="px-4 py-3 text-center text-white">
          {currentPhoto.metadata.caption}
        </div>
      )}
    </div>,
    document.body
  );
}


/**
 * Group photos by session
 */
function groupPhotosBySession(photos: Photo[]): PhotoGroup[] {
  const groups = new Map<string | null, Photo[]>();

  for (const photo of photos) {
    const key = photo.instanceId || null;
    const existing = groups.get(key) || [];
    existing.push(photo);
    groups.set(key, existing);
  }

  // Convert to array and sort by date (most recent first)
  const result: PhotoGroup[] = [];

  for (const [instanceId, groupPhotos] of groups) {
    // Sort photos within group by date
    groupPhotos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    result.push({
      instanceId,
      sessionDate: groupPhotos[0]?.createdAt,
      photos: groupPhotos,
    });
  }

  // Sort groups by date (most recent first)
  result.sort((a, b) => {
    const dateA = a.sessionDate?.getTime() || 0;
    const dateB = b.sessionDate?.getTime() || 0;
    return dateB - dateA;
  });

  return result;
}

/**
 * Photo Gallery Component
 */
export function PhotoGallery({
  recipeId: _recipeId,
  photos,
  groupBySession = false,
  onSessionTap,
  className = '',
}: PhotoGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Group photos if requested
  const photoGroups = useMemo(() => {
    if (groupBySession) {
      return groupPhotosBySession(photos);
    }
    // Single group with all photos
    return [{ instanceId: null, photos }];
  }, [photos, groupBySession]);

  // Flat list for viewer navigation
  const flatPhotos = useMemo(() => {
    return photoGroups.flatMap((group) => group.photos);
  }, [photoGroups]);

  const handlePhotoClick = useCallback(
    (photo: Photo) => {
      const index = flatPhotos.findIndex((p) => p.id === photo.id);
      if (index !== -1) {
        setViewerIndex(index);
        setViewerOpen(true);
      }
    },
    [flatPhotos]
  );

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
  }, []);

  if (photos.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center ${className}`}
      >
        <PhotoIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No photos yet</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {photoGroups.map((group, groupIndex) => (
        <div key={group.instanceId || `group-${groupIndex}`} className="mb-6 last:mb-0">
          {/* Group header (only show if grouping by session) */}
          {groupBySession && (
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {group.instanceId
                  ? `Cook Session - ${group.sessionDate?.toLocaleDateString() || 'Unknown date'}`
                  : 'General Photos'}
              </h4>
              {group.instanceId && onSessionTap && (
                <button
                  onClick={() => onSessionTap(group.instanceId!)}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  View Session
                </button>
              )}
            </div>
          )}

          {/* Photo grid */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {group.photos.map((photo) => (
              <PhotoThumbnail
                key={photo.id}
                photo={photo}
                onClick={() => handlePhotoClick(photo)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Full-size viewer */}
      {viewerOpen && (
        <PhotoViewer
          photos={flatPhotos}
          initialIndex={viewerIndex}
          onClose={handleCloseViewer}
          onSessionTap={onSessionTap}
        />
      )}
    </div>
  );
}
