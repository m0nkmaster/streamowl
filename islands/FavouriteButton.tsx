import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { useToast } from "./Toast.tsx";

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
  const { showToast, ToastContainer } = useToast();

  const handleToggle = async () => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    const newFavouriteState = !isFavourite;
    const previousState = isFavourite;

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
        setIsFavourite(previousState);
        const error = await response.json();
        console.error("Failed to update favourite status:", error);
        const errorMessage = response.status === 401
          ? "Please log in to favourite content"
          : "Failed to update favourite status. Please try again.";
        showToast(errorMessage, "error");
      } else {
        // Show success toast with undo
        const message = newFavouriteState
          ? "Added to favourites"
          : "Removed from favourites";
        showToast(
          message,
          "success",
          3000,
          newFavouriteState
            ? () => {
              // Undo: remove from favourites
              fetch(`/api/content/${tmdbId}/favourite`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              }).then(() => setIsFavourite(false));
            }
            : () => {
              // Undo: add back to favourites
              fetch(`/api/content/${tmdbId}/favourite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }).then(() => setIsFavourite(true));
            },
        );
      }
    } catch (error) {
      // Revert on error
      setIsFavourite(previousState);
      console.error("Error updating favourite status:", error);
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
        class={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
          isFavourite
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label={isFavourite
          ? "Remove from favourites"
          : "Add to favourites"}
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
    </>
  );
}
