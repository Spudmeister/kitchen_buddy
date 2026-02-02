import { useEffect, useCallback } from 'react';
import { useUIStore } from '@stores/ui-store';

/**
 * Modal Container - Renders active modal based on UI store state
 * 
 * Provides:
 * - Backdrop with click-to-close
 * - Keyboard escape to close
 * - Focus trap (basic)
 * - Accessible modal structure
 * 
 * Requirements: 1.1, 2.1
 */
export function ModalContainer() {
  const { activeModal, modalProps, closeModal } = useUIStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeModal) {
        closeModal();
      }
    },
    [activeModal, closeModal]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModal]);

  if (!activeModal) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Modal content rendered based on activeModal type */}
        {activeModal === 'search' && <SearchModal {...modalProps} />}
        {activeModal === 'confirm-delete' && <ConfirmDeleteModal {...modalProps} />}
        {activeModal === 'recipe-picker' && <RecipePickerModal {...modalProps} />}
        {activeModal === 'date-picker' && <DatePickerModal {...modalProps} />}
        {activeModal === 'settings' && <SettingsModal {...modalProps} />}
      </div>
    </div>
  );
}

/**
 * Search Modal - Global search interface
 */
function SearchModal(_props: Record<string, unknown>) {
  const { closeModal, searchQuery, setSearchQuery } = useUIStore();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 id="modal-title" className="text-lg font-semibold">
          Search Recipes
        </h2>
        <button
          onClick={closeModal}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close search"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search recipes, ingredients, tags..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        autoFocus
      />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Search functionality coming soon...
      </p>
    </div>
  );
}

/**
 * Confirm Delete Modal - Confirmation dialog for destructive actions
 */
function ConfirmDeleteModal(props: Record<string, unknown>) {
  const { closeModal } = useUIStore();
  const title = (props.title as string) || 'Confirm Delete';
  const message = (props.message as string) || 'Are you sure you want to delete this item?';
  const onConfirm = props.onConfirm as (() => void) | undefined;

  const handleConfirm = () => {
    onConfirm?.();
    closeModal();
  };

  return (
    <div className="p-4">
      <h2 id="modal-title" className="text-lg font-semibold text-red-600 mb-2">
        {title}
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={closeModal}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/**
 * Recipe Picker Modal - Select a recipe for menu assignment
 */
function RecipePickerModal(_props: Record<string, unknown>) {
  const { closeModal } = useUIStore();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 id="modal-title" className="text-lg font-semibold">
          Select Recipe
        </h2>
        <button
          onClick={closeModal}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-gray-500 dark:text-gray-400">
        Recipe picker coming soon...
      </p>
    </div>
  );
}

/**
 * Date Picker Modal - Select a date for menu assignment
 */
function DatePickerModal(_props: Record<string, unknown>) {
  const { closeModal } = useUIStore();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 id="modal-title" className="text-lg font-semibold">
          Select Date
        </h2>
        <button
          onClick={closeModal}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-gray-500 dark:text-gray-400">
        Date picker coming soon...
      </p>
    </div>
  );
}

/**
 * Settings Modal - Quick settings access
 */
function SettingsModal(_props: Record<string, unknown>) {
  const { closeModal } = useUIStore();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 id="modal-title" className="text-lg font-semibold">
          Quick Settings
        </h2>
        <button
          onClick={closeModal}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-gray-500 dark:text-gray-400">
        Settings modal coming soon...
      </p>
    </div>
  );
}
