import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { useToast } from "./Toast.tsx";

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
  const { showToast, ToastContainer } = useToast();

  const handleToggle = async () => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    const newWatchlistState = !isInWatchlist;
    const previousState = isInWatchlist;

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
        setIsInWatchlist(previousState);
        const error = await response.json();
        console.error("Failed to update watchlist status:", error);
        const errorMessage = response.status === 401
          ? "Please log in to add items to your watchlist"
          : "Failed to update watchlist. Please try again.";
        showToast(errorMessage, "error");
      } else {
        // Show success toast with undo
        const message = newWatchlistState
          ? "Added to watchlist"
          : "Removed from watchlist";
        showToast(
          message,
          "success",
          3000,
          newWatchlistState
            ? () => {
              // Undo: remove from watchlist
              fetch(`/api/content/${tmdbId}/watchlist`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              }).then(() => setIsInWatchlist(false));
            }
            : () => {
              // Undo: add back to watchlist
              fetch(`/api/content/${tmdbId}/watchlist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }).then(() => setIsInWatchlist(true));
            },
        );
      }
    } catch (error) {
      // Revert on error
      setIsInWatchlist(previousState);
      console.error("Error updating watchlist status:", error);
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
        aria-label={isLoading
          ? "Loading watchlist status"
          : isInWatchlist
          ? "Remove from watchlist"
          : "Add to watchlist"}
        aria-busy={isLoading}
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
    </>
  );
}
