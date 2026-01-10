import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface FavouriteButtonProps {
  tmdbId: number;
  initialStatus: "watched" | "to_watch" | "favourite" | null;
}

/**
 * Island component for favouriting content
 * Handles optimistic UI updates and API calls
 */
export default function FavouriteButton(
  { tmdbId, initialStatus }: FavouriteButtonProps,
) {
  const [isFavourite, setIsFavourite] = useState(
    initialStatus === "favourite",
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    const newFavouriteState = !isFavourite;

    // Optimistic update
    setIsFavourite(newFavouriteState);

    try {
      const method = newFavouriteState ? "POST" : "DELETE";
      const response = await fetch(`/api/content/${tmdbId}/favourite`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Revert on error
        setIsFavourite(!newFavouriteState);
        const error = await response.json();
        console.error("Failed to update favourite status:", error);
        alert("Failed to update favourite status. Please try again.");
      }
    } catch (error) {
      // Revert on error
      setIsFavourite(!newFavouriteState);
      console.error("Error updating favourite status:", error);
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
      class={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
        isFavourite
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
    >
      <svg
        class={`w-5 h-5 ${isFavourite ? "fill-current" : ""}`}
        fill={isFavourite ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {isLoading
        ? "Loading..."
        : isFavourite
        ? "Favourited"
        : "Add to Favourites"}
    </button>
  );
}
