interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Custom loading message for screen readers */
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

/**
 * Loading spinner component
 * 
 * Accessible loading indicator with screen reader support.
 * Requirements: 32.1
 */
export function LoadingSpinner({ size = 'md', className = '', label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-primary-600`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
