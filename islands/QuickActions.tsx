import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface QuickActionsProps {
  tmdbId: number;
  initialStatus: "watched" | "to_watch" | "favourite" | null;
  onAction?: (action: string, success: boolean) => void;
}

/**
 * Quick action buttons that appear on hover over content cards
 * Provides one-tap actions for watchlist, favourite, and watched status
 */
export default function QuickActions({
  tmdbId,
  initialStatus,
  onAction,
}: QuickActionsProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(
    initialStatus === "to_watch",
  );
  const [isFavourite, setIsFavourite] = useState(
    initialStatus === "favourite",
  );
  const [isWatched, setIsWatched] = useState(initialStatus === "watched");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Sync state when initialStatus changes
  useEffect(() => {
    setIsInWatchlist(initialStatus === "to_watch");
    setIsFavourite(initialStatus === "favourite");
    setIsWatched(initialStatus === "watched");
  }, [initialStatus]);

  const handleAction = async (
    action: "watchlist" | "favourite" | "watched",
  ) => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(action);

    let endpoint: string;
    let method: "POST" | "DELETE";
    let newState: boolean;
    let stateSetter: (value: boolean) => void;
    let errorMessage: string;

    switch (action) {
      case "watchlist":
        endpoint = `/api/content/${tmdbId}/watchlist`;
        newState = !isInWatchlist;
        method = newState ? "POST" : "DELETE";
        stateSetter = setIsInWatchlist;
        errorMessage = "Failed to update watchlist";
        break;
      case "favourite":
        endpoint = `/api/content/${tmdbId}/favourite`;
        newState = !isFavourite;
        method = newState ? "POST" : "DELETE";
        stateSetter = setIsFavourite;
        errorMessage = "Failed to update favourites";
        break;
      case "watched":
        endpoint = `/api/content/${tmdbId}/watched`;
        newState = !isWatched;
        method = newState ? "POST" : "DELETE";
        stateSetter = setIsWatched;
        errorMessage = "Failed to update watched status";
        break;
    }

    // Optimistic update
    stateSetter(newState);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Revert on error
        stateSetter(!newState);
        let finalErrorMessage = errorMessage;
        try {
          const error = await response.json();
          if (response.status === 401) {
            finalErrorMessage = "Please log in to use this feature";
          } else {
            finalErrorMessage = error.message || errorMessage;
          }
        } catch {
          // Ignore JSON parse errors
        }
        console.error(`${errorMessage}:`, finalErrorMessage);
        onAction?.(action, false);
      } else {
        onAction?.(action, true);
      }
    } catch (error) {
      // Revert on error
      stateSetter(!newState);
      console.error(`${errorMessage}:`, error);
      onAction?.(action, false);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div class="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg">
      {/* Watchlist Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction("watchlist");
        }}
        disabled={isLoading === "watchlist"}
        class={`p-2 rounded-full transition-colors ${
          isInWatchlist
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-white text-gray-800 hover:bg-gray-100"
        } ${isLoading === "watchlist" ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label={isInWatchlist
          ? "Remove from watchlist"
          : "Add to watchlist"}
        title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      >
        <svg
          class="w-5 h-5"
          fill={isInWatchlist ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>

      {/* Favourite Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction("favourite");
        }}
        disabled={isLoading === "favourite"}
        class={`p-2 rounded-full transition-colors ${
          isFavourite
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-white text-gray-800 hover:bg-gray-100"
        } ${isLoading === "favourite" ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label={isFavourite
          ? "Remove from favourites"
          : "Add to favourites"}
        title={isFavourite ? "Remove from favourites" : "Add to favourites"}
      >
        <svg
          class="w-5 h-5"
          fill={isFavourite ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {/* Watched Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAction("watched");
        }}
        disabled={isLoading === "watched"}
        class={`p-2 rounded-full transition-colors ${
          isWatched
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-white text-gray-800 hover:bg-gray-100"
        } ${isLoading === "watched" ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label={isWatched ? "Remove from watched" : "Mark as watched"}
        title={isWatched ? "Remove from watched" : "Mark as watched"}
      >
        <svg
          class="w-5 h-5"
          fill={isWatched ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isWatched
            ? (
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            )
            : (
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            )}
        </svg>
      </button>
    </div>
  );
}
