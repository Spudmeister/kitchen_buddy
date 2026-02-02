/**
 * Empty Menu State Component
 *
 * Displays helpful getting-started suggestions when no menu exists.
 *
 * Requirements: 12.4
 */

import { useNavigate } from 'react-router-dom';
import { CalendarIcon, BookOpenIcon, BeakerIcon, PlusIcon } from '../icons';

/**
 * Props for EmptyMenuState component
 */
export interface EmptyMenuStateProps {
  onCreateMenu: () => void;
}

/**
 * Suggestion card component
 */
function SuggestionCard({
  icon: Icon,
  title,
  description,
  onClick,
  primary = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-xl text-left transition-colors ${
        primary
          ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/30'
          : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <div
        className={`p-2 rounded-lg ${
          primary
            ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3
          className={`font-medium ${
            primary ? 'text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-white'
          }`}
        >
          {title}
        </h3>
        <p
          className={`text-sm mt-1 ${
            primary ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

/**
 * Empty Menu State Component
 */
export function EmptyMenuState({ onCreateMenu }: EmptyMenuStateProps) {
  const navigate = useNavigate();

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
          <CalendarIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Plan Your Week
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create a menu to organize your meals and generate shopping lists.
        </p>
      </div>

      {/* Suggestions */}
      <div className="space-y-3">
        <SuggestionCard
          icon={PlusIcon}
          title="Create a New Menu"
          description="Start planning your meals for the week ahead."
          onClick={onCreateMenu}
          primary
        />

        <SuggestionCard
          icon={BookOpenIcon}
          title="Browse Recipes"
          description="Explore your recipe collection for inspiration."
          onClick={() => navigate('/search')}
        />

        <SuggestionCard
          icon={BeakerIcon}
          title="Brainstorm"
          description="Find recipes based on ingredients you have."
          onClick={() => navigate('/plan/brainstorm')}
        />
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          💡 Quick Tips
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Assign recipes to specific days and meals</li>
          <li>• Track leftover expiration dates automatically</li>
          <li>• Generate shopping lists from your menu</li>
          <li>• See total cook time for each day</li>
        </ul>
      </div>
    </div>
  );
}
