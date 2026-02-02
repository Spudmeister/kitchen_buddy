import { useUIStore } from '@stores/ui-store';

/**
 * Toast notification container
 * Displays toast notifications from the UI store
 * 
 * Uses ARIA live regions to announce notifications to screen readers.
 * Requirements: 32.1
 */
export function ToastContainer() {
  const { toasts, dismissToast } = useUIStore();

  return (
    <div 
      className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right duration-200 ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-white'
          }`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-white/80 hover:text-white p-1 -mr-1 rounded focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label={`Dismiss notification: ${toast.message}`}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
