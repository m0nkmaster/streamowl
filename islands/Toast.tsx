import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
  onUndo?: () => void;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

/**
 * Toast notification container component
 * Displays toast notifications at the top-right of the screen
 */
function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (!IS_BROWSER || toasts.length === 0) return null;

  return (
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          class={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
            toast.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : toast.type === "error"
              ? "bg-red-100 text-red-800 border border-red-200"
              : "bg-blue-100 text-blue-800 border border-blue-200"
          }`}
        >
          <div class="flex-1">
            <p class="text-sm font-medium">{toast.message}</p>
          </div>
          <div class="flex items-center gap-2">
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  onRemove(toast.id);
                }}
                class="text-sm font-medium underline hover:no-underline"
                aria-label="Undo action"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              class="text-gray-500 hover:text-gray-700"
              aria-label="Close notification"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Hook for managing toast notifications
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
    duration: number = 3000,
    onUndo?: () => void,
  ) => {
    if (!IS_BROWSER) return;

    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, type, duration, onUndo };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    toasts,
    showToast,
    removeToast,
    ToastContainer: () => (
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    ),
  };
}
