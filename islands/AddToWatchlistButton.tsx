import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface AddToWatchlistButtonProps {
  tmdbId: number;
  initialStatus: "watched" | "to_watch" | "favourite" | null;
}

/**
 * Island component for adding content to watchlist
 * Handles optimistic UI updates and API calls
 */
export default function AddToWatchlistButton(
  { tmdbId, initialStatus }: AddToWatchlistButtonProps,
) {
  const [isInWatchlist, setIsInWatchlist] = useState(
    initialStatus === "to_watch",
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    const newWatchlistState = !isInWatchlist;

    // Optimistic update
    setIsInWatchlist(newWatchlistState);

    try {
      const method = newWatchlistState ? "POST" : "DELETE";
      const response = await fetch(`/api/content/${tmdbId}/watchlist`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Revert on error
        setIsInWatchlist(!newWatchlistState);
        const error = await response.json();
        console.error("Failed to update watchlist status:", error);
        alert("Failed to update watchlist. Please try again.");
      }
    } catch (error) {
      // Revert on error
      setIsInWatchlist(!newWatchlistState);
      console.error("Error updating watchlist status:", error);
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
        isInWatchlist
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isLoading
        ? "Loading..."
        : isInWatchlist
        ? "✓ In Watchlist"
        : "Add to Watchlist"}
    </button>
  );
}
