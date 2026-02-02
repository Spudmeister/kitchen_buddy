/**
 * Sue Quick Prompts Component
 *
 * Displays pre-built prompts for common menu planning requests.
 * Tapping a prompt sends it to Sue.
 *
 * Requirements: 16.2
 */

import type { SueQuickPrompt } from '@/types/sue';

/**
 * Pre-built prompts for common requests
 */
const QUICK_PROMPTS: SueQuickPrompt[] = [
  {
    id: 'dinner-tonight',
    text: 'What should I make for dinner tonight?',
    category: 'general',
  },
  {
    id: 'quick-meal',
    text: 'I need something quick, under 30 minutes',
    category: 'time',
  },
  {
    id: 'vegetarian',
    text: 'Suggest something vegetarian',
    category: 'dietary',
  },
  {
    id: 'with-chicken',
    text: 'What can I make with chicken?',
    category: 'general',
  },
  {
    id: 'new-cuisine',
    text: 'I want to try a new cuisine',
    category: 'variety',
  },
  {
    id: 'healthy-meal-prep',
    text: 'Something healthy for meal prep',
    category: 'dietary',
  },
  {
    id: 'kid-friendly',
    text: 'Kid-friendly dinner ideas',
    category: 'general',
  },
  {
    id: 'complement-menu',
    text: "What goes well with what's already planned?",
    category: 'variety',
  },
];

/**
 * Category colors for visual distinction
 */
const CATEGORY_STYLES: Record<SueQuickPrompt['category'], string> = {
  general: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
  dietary: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50',
  time: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50',
  variety: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50',
};

/**
 * Props for SueQuickPrompts
 */
export interface SueQuickPromptsProps {
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Sue Quick Prompts Component
 */
export function SueQuickPrompts({
  onPromptSelect,
  disabled = false,
  className = '',
}: SueQuickPromptsProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
        Quick prompts
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onPromptSelect(prompt.text)}
            disabled={disabled}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium
              transition-colors
              ${CATEGORY_STYLES[prompt.category]}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-label={`Ask Sue: ${prompt.text}`}
          >
            {prompt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function SueQuickPromptsCompact({
  onPromptSelect,
  disabled = false,
  maxPrompts = 4,
  className = '',
}: SueQuickPromptsProps & { maxPrompts?: number }) {
  const prompts = QUICK_PROMPTS.slice(0, maxPrompts);

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {prompts.map((prompt) => (
        <button
          key={prompt.id}
          onClick={() => onPromptSelect(prompt.text)}
          disabled={disabled}
          className={`
            px-2 py-1 rounded-full text-xs font-medium
            transition-colors
            ${CATEGORY_STYLES[prompt.category]}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-label={`Ask Sue: ${prompt.text}`}
        >
          {prompt.text}
        </button>
      ))}
    </div>
  );
}

export { QUICK_PROMPTS };
