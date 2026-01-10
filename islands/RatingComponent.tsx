import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { useToast } from "./Toast.tsx";

interface RatingComponentProps {
  tmdbId: number;
  initialRating: number | null;
}

/**
 * Island component for rating content on a 1-10 scale with half-point precision
 * Uses a slider/range input for precise selection
 */
export default function RatingComponent(
  { tmdbId, initialRating }: RatingComponentProps,
) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [tempRating, setTempRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast, ToastContainer } = useToast();

  // Update local state when initialRating prop changes
  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  const handleSliderChange = (value: number) => {
    // Round to half-point precision
    const roundedValue = Math.round(value * 2) / 2;
    setTempRating(roundedValue);
  };

  const handleSliderRelease = async (value: number) => {
    if (!IS_BROWSER || isLoading) return;

    // Round to half-point precision
    const roundedValue = Math.round(value * 2) / 2;

    // If same as current rating, don't update
    if (rating === roundedValue) {
      setTempRating(null);
      return;
    }

    setIsLoading(true);
    const previousRating = rating;

    // Optimistic update
    setRating(roundedValue);
    setTempRating(null);

    try {
      const response = await fetch(`/api/content/${tmdbId}/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rating: roundedValue }),
      });

      if (!response.ok) {
        // Revert on error
        setRating(previousRating);
        const error = await response.json();
        console.error("Failed to set rating:", error);
        const errorMessage = response.status === 401
          ? "Please log in to rate content"
          : "Failed to set rating. Please try again.";
        showToast(errorMessage, "error");
      } else {
        // Show success toast with undo
        showToast(
          `Rated ${roundedValue.toFixed(1)}/10`,
          "success",
          3000,
          () => {
            // Undo: restore previous rating
            if (previousRating !== null) {
              fetch(`/api/content/${tmdbId}/rating`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating: previousRating }),
              }).then(() => setRating(previousRating));
            } else {
              fetch(`/api/content/${tmdbId}/rating`, {
                method: "DELETE",
              }).then(() => setRating(null));
            }
          },
        );
      }
    } catch (error) {
      // Revert on error
      setRating(previousRating);
      console.error("Error setting rating:", error);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRating = async () => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    const previousRating = rating;

    // Optimistic update
    setRating(null);

    try {
      const response = await fetch(`/api/content/${tmdbId}/rating`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert on error
        setRating(previousRating);
        const error = await response.json();
        console.error("Failed to remove rating:", error);
        showToast("Failed to remove rating. Please try again.", "error");
      } else {
        // Show success toast with undo
        showToast(
          "Rating removed",
          "success",
          3000,
          () => {
            // Undo: restore previous rating
            if (previousRating !== null) {
              fetch(`/api/content/${tmdbId}/rating`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating: previousRating }),
              }).then(() => setRating(previousRating));
            }
          },
        );
      }
    } catch (error) {
      // Revert on error
      setRating(previousRating);
      console.error("Error removing rating:", error);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const displayRating = tempRating ?? rating ?? 0;

  return (
    <>
      <ToastContainer />
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <label for="rating-slider" class="text-sm font-medium text-gray-700">
            Your Rating
          </label>
          <div class="flex items-center gap-3">
            <input
              type="range"
              id="rating-slider"
              min="1"
              max="10"
              step="0.5"
              value={displayRating}
              onChange={(e) =>
                handleSliderChange(parseFloat(e.currentTarget.value))}
              onMouseUp={(e) =>
                handleSliderRelease(parseFloat(e.currentTarget.value))}
              onTouchEnd={(e) =>
                handleSliderRelease(parseFloat(e.currentTarget.value))}
              disabled={isLoading}
              aria-describedby="rating-value"
              aria-busy={isLoading}
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-indigo-600"
            />
            <div id="rating-value" class="flex items-center gap-2 min-w-[80px]">
              <span
                class="text-lg font-semibold text-gray-900"
                aria-live="polite"
              >
                {displayRating.toFixed(1)}
              </span>
              <span class="text-sm text-gray-500">/ 10</span>
            </div>
          </div>
        </div>

        {/* Quick select buttons for common ratings */}
        <div class="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleSliderRelease(value)}
              disabled={isLoading}
              class={`px-3 py-1 text-sm rounded-md transition-colors ${
                rating === value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              aria-label={`Rate ${value} out of 10`}
            >
              {value}
            </button>
          ))}
        </div>

        {rating !== null && (
          <button
            type="button"
            onClick={handleRemoveRating}
            disabled={isLoading}
            aria-label="Remove rating"
            aria-busy={isLoading}
            class="text-sm text-gray-500 hover:text-gray-700 underline self-start disabled:opacity-50"
          >
            Remove rating
          </button>
        )}
      </div>
    </>
  );
}
