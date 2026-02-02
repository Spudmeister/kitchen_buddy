/**
 * Skip Links Component
 *
 * Provides skip navigation links for keyboard users to bypass repetitive content.
 * These links are visually hidden but accessible to screen readers and keyboard users.
 *
 * Requirements: 32.2
 */

import { SKIP_LINK_TARGETS } from '../../utils/accessibility';

/**
 * Skip Links Component
 */
export function SkipLinks() {
  return (
    <nav aria-label="Skip navigation" className="sr-only focus-within:not-sr-only">
      <ul className="fixed top-0 left-0 z-[100] flex flex-col gap-1 p-2 bg-white dark:bg-gray-900">
        <li>
          <a
            href={`#${SKIP_LINK_TARGETS.MAIN_CONTENT}`}
            className="block px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-800 border border-primary-600 dark:border-primary-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Skip to main content
          </a>
        </li>
        <li>
          <a
            href={`#${SKIP_LINK_TARGETS.NAVIGATION}`}
            className="block px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-800 border border-primary-600 dark:border-primary-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Skip to navigation
          </a>
        </li>
        <li>
          <a
            href={`#${SKIP_LINK_TARGETS.SEARCH}`}
            className="block px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-800 border border-primary-600 dark:border-primary-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Skip to search
          </a>
        </li>
      </ul>
    </nav>
  );
}
