import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

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

  const handleToggle = async () => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    const newWatchedState = !isWatched;

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
        setIsWatched(!newWatchedState);
        const error = await response.json();
        console.error("Failed to update watched status:", error);
        alert("Failed to update watched status. Please try again.");
      }
    } catch (error) {
      // Revert on error
      setIsWatched(!newWatchedState);
      console.error("Error updating watched status:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
}
