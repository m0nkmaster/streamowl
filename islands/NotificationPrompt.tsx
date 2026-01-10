import { useEffect, useState } from "preact/hooks";

interface NotificationPromptProps {
  isAuthenticated: boolean;
}

/**
 * NotificationPrompt component
 *
 * Displays a prompt to enable push notifications on first visit.
 * Only shows for authenticated users who haven't been prompted before.
 * Handles the Web Push subscription flow.
 */
export default function NotificationPrompt({
  isAuthenticated,
}: NotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show for authenticated users
    if (!isAuthenticated) {
      return;
    }

    // Check if notifications are supported
    if (!("Notification" in globalThis) || !("serviceWorker" in navigator)) {
      return;
    }

    // Check if already granted or denied
    if (Notification.permission !== "default") {
      return;
    }

    // Check if user has dismissed the prompt before
    const dismissedBefore = localStorage.getItem("notification-prompt-dismissed");
    if (dismissedBefore) {
      // Check if it's been more than 7 days since dismissal
      const dismissedAt = parseInt(dismissedBefore, 10);
      const daysSinceDismissal = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 7) {
        return;
      }
    }

    // Show the prompt after a short delay (better UX)
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  /**
   * Convert base64url string to Uint8Array for applicationServerKey
   */
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  /**
   * Subscribe to push notifications
   */
  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    setError(null);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setShowPrompt(false);
        localStorage.setItem(
          "notification-prompt-dismissed",
          Date.now().toString(),
        );
        return;
      }

      // Get the VAPID public key from the server
      const vapidResponse = await fetch("/api/notifications/vapid-key");
      if (!vapidResponse.ok) {
        throw new Error("Failed to get VAPID key");
      }
      const { publicKey } = await vapidResponse.json();

      if (!publicKey) {
        throw new Error("Push notifications are not configured on this server");
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const subscribeResponse = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!subscribeResponse.ok) {
        throw new Error("Failed to save subscription");
      }

      // Hide prompt on success
      setShowPrompt(false);
      localStorage.setItem("notifications-enabled", "true");
    } catch (err) {
      console.error("Failed to enable notifications:", err);
      setError(
        err instanceof Error ? err.message : "Failed to enable notifications",
      );
    } finally {
      setIsSubscribing(false);
    }
  };

  /**
   * Dismiss the notification prompt
   */
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notification-prompt-dismissed", Date.now().toString());
    // Fade out animation then hide
    setTimeout(() => {
      setShowPrompt(false);
    }, 300);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      class={`fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 transition-opacity duration-300 ${
        dismissed ? "opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-labelledby="notification-prompt-title"
      aria-describedby="notification-prompt-description"
    >
      <div class="flex items-start gap-3">
        {/* Bell icon */}
        <div class="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
          <svg
            class="w-5 h-5 text-indigo-600 dark:text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <h3
            id="notification-prompt-title"
            class="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Enable Notifications
          </h3>
          <p
            id="notification-prompt-description"
            class="mt-1 text-sm text-gray-600 dark:text-gray-400"
          >
            Get notified about new releases and personalised recommendations.
          </p>

          {error && (
            <p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div class="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={isSubscribing}
              class={`px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isSubscribing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubscribing ? "Enabling..." : "Enable"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isSubscribing}
              class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Not now
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          class="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          aria-label="Dismiss notification prompt"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
