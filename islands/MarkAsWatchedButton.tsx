import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { useToast } from "./Toast.tsx";

interface MarkAsWatchedButtonProps {
  tmdbId: number;
  initialStatus: "watched" | "to_watch" | "favourite" | null;
}

/**
 * Island component for marking content as watched
 * Handles optimistic UI updates and API calls
 */
export default function MarkAsWatchedButton(
  { tmdbId, initialStatus }: MarkAsWatchedButtonProps,
) {
  const [isWatched, setIsWatched] = useState(
    initialStatus === "watched",
  );
  const [isLoading, setIsLoading] = useState(false);
  const { showToast, ToastContainer } = useToast();

  const handleToggle = async () => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    const newWatchedState = !isWatched;
    const previousState = isWatched;

    // Optimistic update
    setIsWatched(newWatchedState);

    try {
      const method = newWatchedState ? "POST" : "DELETE";
      const response = await fetch(`/api/content/${tmdbId}/watched`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Revert on error
        setIsWatched(previousState);
        const error = await response.json();
        console.error("Failed to update watched status:", error);
        const errorMessage = response.status === 401
          ? "Please log in to mark content as watched"
          : "Failed to update watched status. Please try again.";
        showToast(errorMessage, "error");
      } else {
        // Show success toast with undo
        const message = newWatchedState
          ? "Marked as watched"
          : "Removed from watched";
        showToast(
          message,
          "success",
          3000,
          newWatchedState
            ? () => {
              // Undo: remove from watched
              fetch(`/api/content/${tmdbId}/watched`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              }).then(() => setIsWatched(false));
            }
            : () => {
              // Undo: mark as watched again
              fetch(`/api/content/${tmdbId}/watched`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }).then(() => setIsWatched(true));
            },
        );
      }
    } catch (error) {
      // Revert on error
      setIsWatched(previousState);
      console.error("Error updating watched status:", error);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        class={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isWatched
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isLoading ? "Loading..." : isWatched ? "✓ Watched" : "Mark as Watched"}
      </button>
    </>
  );
}
