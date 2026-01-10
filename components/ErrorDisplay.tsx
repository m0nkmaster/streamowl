/**
 * Reusable error display component with retry functionality
 * Displays user-friendly error messages with optional retry action
 */

interface ErrorDisplayProps {
  /** Error message to display */
  message: string;
  /** Optional retry callback function */
  onRetry?: () => void;
  /** Additional context or help text */
  helpText?: string;
  /** CSS classes for custom styling */
  className?: string;
}

/**
 * Error display component with retry functionality
 * Provides consistent error UI across the application
 */
export default function ErrorDisplay({
  message,
  onRetry,
  helpText,
  className = "",
}: ErrorDisplayProps) {
  return (
    <div
      class={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg
            class="h-5 w-5 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-red-800">{message}</h3>
          {helpText && <p class="mt-2 text-sm text-red-700">{helpText}</p>}
          {onRetry && (
            <div class="mt-4">
              <button
                type="button"
                onClick={onRetry}
                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg
                  class="mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
