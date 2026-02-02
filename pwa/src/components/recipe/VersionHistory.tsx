/**
 * Version History Component
 *
 * Displays all versions of a recipe with timestamps.
 * Allows viewing any previous version and restoring (creates new version).
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { useState, useCallback } from 'react';
import type { RecipeVersion } from '../../types/recipe';
import {
  ClockIcon,
  ArrowUturnLeftIcon,
  EyeIcon,
  ChevronLeftIcon,
} from '../icons';

/**
 * Props for VersionHistory component
 */
export interface VersionHistoryProps {
  /** Recipe ID */
  recipeId: string;
  /** Current version number */
  currentVersion: number;
  /** All versions of the recipe */
  versions: RecipeVersion[];
  /** Callback when user wants to view a specific version */
  onViewVersion?: (version: number) => void;
  /** Callback when user wants to restore a version (creates new version with that content) */
  onRestoreVersion?: (version: number) => void;
  /** Callback to go back */
  onBack?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format a date to a human-readable string
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return `Today at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  }
  // Show full date
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date to full timestamp
 */
function formatFullTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Single version item in the history list
 */
interface VersionItemProps {
  version: RecipeVersion;
  isCurrent: boolean;
  isSelected: boolean;
  onView: () => void;
  onRestore: () => void;
}

function VersionItem({ version, isCurrent, isSelected, onView, onRestore }: VersionItemProps) {
  return (
    <li
      className={`
        border-l-4 pl-4 py-3 transition-colors
        ${isSelected 
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              Version {version.version}
            </span>
            {isCurrent && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                Current
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
            {version.title}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-500">
            <ClockIcon className="w-3.5 h-3.5" />
            <time dateTime={version.createdAt.toISOString()} title={formatFullTimestamp(version.createdAt)}>
              {formatDate(version.createdAt)}
            </time>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onView}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={`View version ${version.version}`}
            title="View this version"
          >
            <EyeIcon className="w-5 h-5" />
          </button>
          {!isCurrent && (
            <button
              onClick={onRestore}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={`Restore version ${version.version}`}
              title="Restore this version"
            >
              <ArrowUturnLeftIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Version History Component
 */
export function VersionHistory({
  currentVersion,
  versions,
  onViewVersion,
  onRestoreVersion,
  onBack,
  className = '',
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);

  // Sort versions in descending order (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  const handleView = useCallback((version: number) => {
    setSelectedVersion(version);
    onViewVersion?.(version);
  }, [onViewVersion]);

  const handleRestoreClick = useCallback((version: number) => {
    setConfirmRestore(version);
  }, []);

  const handleConfirmRestore = useCallback(() => {
    if (confirmRestore !== null) {
      onRestoreVersion?.(confirmRestore);
      setConfirmRestore(null);
    }
  }, [confirmRestore, onRestoreVersion]);

  const handleCancelRestore = useCallback(() => {
    setConfirmRestore(null);
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 p-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Go back"
            >
              <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <h2 className="flex-1 text-xl font-bold text-gray-900 dark:text-white">
            Version History
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* Restore confirmation dialog */}
      {confirmRestore !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Restore Version {confirmRestore}?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will create a new version with the content from version {confirmRestore}. 
              All existing versions will be preserved.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelRestore}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version list */}
      <div className="p-4">
        {versions.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No version history available.
          </p>
        ) : (
          <ul className="space-y-2" role="list" aria-label="Recipe versions">
            {sortedVersions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                isCurrent={version.version === currentVersion}
                isSelected={version.version === selectedVersion}
                onView={() => handleView(version.version)}
                onRestore={() => handleRestoreClick(version.version)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Info footer */}
      <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Restoring a version creates a new version with that content.
          <br />
          Previous versions are never deleted.
        </p>
      </footer>
    </div>
  );
}
