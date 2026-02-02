/**
 * Sue Chat Component
 *
 * Conversational interface for the Menu Assistant (Sue).
 * Displays message history, shows suggestions as tappable Recipe_Cards,
 * and includes a typing indicator.
 *
 * Requirements: 16.1, 16.2, 16.3
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSueStore } from '@stores/sue-store';
import { useSueChat, useAcceptSuggestion, useSueAvailability } from '@hooks/useSue';
import { useCurrentMenu } from '@hooks/useMenus';
import { useUIStore } from '@stores/ui-store';
import type { SueChatMessage, RecipeSuggestion } from '@/types/sue';
import type { MealSlot } from '@/types/menu';
import { SueSuggestionCardCompact } from './SueSuggestionCard';
import { SueQuickPrompts } from './SueQuickPrompts';
import { SueConstraintsPanel, SueConstraintsSummary } from './SueConstraintsPanel';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@components/icons';

/**
 * Typing indicator component
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-3">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">Sue is thinking...</span>
    </div>
  );
}

/**
 * Message bubble component
 */
function MessageBubble({
  message,
  onAcceptSuggestion,
  onRejectSuggestion,
}: {
  message: SueChatMessage;
  onAcceptSuggestion?: (suggestion: RecipeSuggestion) => void;
  onRejectSuggestion?: (suggestion: RecipeSuggestion) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-2
          ${
            isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
          }
        `}
      >
        {/* Avatar for Sue */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">Sue</span>
          </div>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.suggestions.map((suggestion) => (
              <SueSuggestionCardCompact
                key={suggestion.recipe.id}
                suggestion={suggestion}
                onAccept={() => onAcceptSuggestion?.(suggestion)}
                onReject={() => onRejectSuggestion?.(suggestion)}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={`text-xs mt-1 ${
            isUser ? 'text-primary-200' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

/**
 * Date picker modal for accepting suggestions
 */
function DateSlotPicker({
  isOpen,
  onClose,
  onSelect,
  recipeName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (date: Date, slot: MealSlot) => void;
  recipeName: string;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('dinner');

  const handleConfirm = useCallback(() => {
    onSelect(selectedDate, selectedSlot);
    onClose();
  }, [selectedDate, selectedSlot, onSelect, onClose]);

  if (!isOpen) return null;

  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Add to Menu
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          When would you like to have <span className="font-medium">{recipeName}</span>?
        </p>

        {/* Date picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Meal slot picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meal
          </label>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`
                  px-2 py-2 text-sm font-medium rounded-lg capitalize
                  ${
                    selectedSlot === slot
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Add to Menu
        </button>
      </div>
    </div>
  );
}

/**
 * Props for SueChat
 */
export interface SueChatProps {
  className?: string;
}

/**
 * Sue Chat Component
 */
export function SueChat({ className = '' }: SueChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [constraintsOpen, setConstraintsOpen] = useState(false);
  const [datePickerState, setDatePickerState] = useState<{
    isOpen: boolean;
    suggestion: RecipeSuggestion | null;
  }>({ isOpen: false, suggestion: null });

  // Store state
  const {
    messages,
    isTyping,
    constraints,
    setConstraints,
    rejectSuggestion,
    setCurrentMenuId,
  } = useSueStore();

  // Hooks
  const { data: isAvailable } = useSueAvailability();
  const { data: currentMenu } = useCurrentMenu();
  const chatMutation = useSueChat();
  const acceptMutation = useAcceptSuggestion();
  const showToast = useUIStore((state) => state.showToast);

  // Set current menu ID in store
  useEffect(() => {
    setCurrentMenuId(currentMenu?.id);
  }, [currentMenu?.id, setCurrentMenuId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Send message handler
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    chatMutation.mutate({ message: trimmed, menu: currentMenu });
    setInput('');
  }, [input, chatMutation, currentMenu]);

  // Handle quick prompt selection
  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      if (chatMutation.isPending) return;
      chatMutation.mutate({ message: prompt, menu: currentMenu });
    },
    [chatMutation, currentMenu]
  );

  // Handle suggestion acceptance
  const handleAcceptSuggestion = useCallback((suggestion: RecipeSuggestion) => {
    setDatePickerState({ isOpen: true, suggestion });
  }, []);

  // Handle date/slot selection for acceptance
  const handleDateSlotSelect = useCallback(
    (date: Date, slot: MealSlot) => {
      const suggestion = datePickerState.suggestion;
      if (!suggestion || !currentMenu) return;

      acceptMutation.mutate(
        {
          menuId: currentMenu.id,
          recipeId: suggestion.recipe.id,
          date,
          mealSlot: slot,
        },
        {
          onSuccess: (result) => {
            if (result.success) {
              showToast({
                type: 'success',
                message: `Added ${suggestion.recipe.title} to menu`,
              });
            } else {
              showToast({
                type: 'error',
                message: result.error || 'Failed to add to menu',
              });
            }
          },
        }
      );
    },
    [datePickerState.suggestion, currentMenu, acceptMutation, showToast]
  );

  // Handle suggestion rejection
  const handleRejectSuggestion = useCallback(
    (suggestion: RecipeSuggestion) => {
      rejectSuggestion(suggestion.recipe.id);
      showToast({
        type: 'info',
        message: `Won't suggest ${suggestion.recipe.title} again`,
      });
    },
    [rejectSuggestion, showToast]
  );

  // Handle key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Not available state
  if (!isAvailable) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
        <SparklesIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Sue is not available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Enable AI features in Settings to use the Menu Assistant.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Ask Sue</h2>
        </div>
        <SueConstraintsSummary
          constraints={constraints}
          onEdit={() => setConstraintsOpen(true)}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <SparklesIcon className="w-10 h-10 text-primary-300 dark:text-primary-700 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Hi, I'm Sue!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
              I can help you plan your meals. Ask me for suggestions or use a quick prompt below.
            </p>
            <SueQuickPrompts
              onPromptSelect={handleQuickPrompt}
              disabled={chatMutation.isPending}
            />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick prompts (when conversation exists) */}
      {messages.length > 0 && (
        <div className="px-4 pb-2">
          <SueQuickPrompts
            onPromptSelect={handleQuickPrompt}
            disabled={chatMutation.isPending}
            className="opacity-75"
          />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Sue for suggestions..."
            disabled={chatMutation.isPending}
            className="flex-1 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Constraints Panel */}
      <SueConstraintsPanel
        constraints={constraints}
        onChange={setConstraints}
        isOpen={constraintsOpen}
        onClose={() => setConstraintsOpen(false)}
      />

      {/* Date/Slot Picker */}
      <DateSlotPicker
        isOpen={datePickerState.isOpen}
        onClose={() => setDatePickerState({ isOpen: false, suggestion: null })}
        onSelect={handleDateSlotSelect}
        recipeName={datePickerState.suggestion?.recipe.title || ''}
      />
    </div>
  );
}
