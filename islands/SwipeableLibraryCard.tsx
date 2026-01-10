import { useEffect, useRef, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import {
  getGridPosterSize,
  getPosterSrcSet,
  getPosterUrl,
} from "../lib/images.ts";
import { useToast } from "./Toast.tsx";

interface SwipeableLibraryCardProps {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  date: string; // watched_at or added_at
  dateLabel: string; // "Watched" or "Added"
  rating: number | null;
  /**
   * The current library tab context - determines which actions are available
   * - watched: Show "Add to Watchlist" and "Add to Favourites"
   * - to_watch: Show "Mark as Watched" and "Add to Favourites"
   * - favourites: Show "Add to Watchlist" and "Mark as Watched"
   */
  context: "watched" | "to_watch" | "favourites";
  /** Callback when an action is completed to refresh the list */
  onActionComplete?: () => void;
}

const SWIPE_THRESHOLD = 60; // Minimum swipe distance to reveal actions
const ACTION_BUTTON_WIDTH = 140; // Width of the action container when revealed

/**
 * Swipeable library card for mobile devices
 * Swipe left to reveal quick actions
 */
export default function SwipeableLibraryCard({
  tmdb_id,
  type,
  title,
  poster_path,
  date,
  dateLabel,
  rating,
  context,
  onActionComplete,
}: SwipeableLibraryCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { showToast, ToastContainer } = useToast();

  // Detect mobile viewport
  useEffect(() => {
    if (!IS_BROWSER) return;

    const checkMobile = () => {
      // Check for touch capability and narrow viewport
      const isTouchDevice = "ontouchstart" in globalThis ||
        navigator.maxTouchPoints > 0;
      const isNarrowViewport = globalThis.innerWidth < 768;
      setIsMobile(isTouchDevice && isNarrowViewport);
    };

    checkMobile();
    globalThis.addEventListener("resize", checkMobile);
    return () => globalThis.removeEventListener("resize", checkMobile);
  }, []);

  // Close revealed actions when clicking outside
  useEffect(() => {
    if (!IS_BROWSER || !isRevealed) return;

    const handleClickOutside = (e: Event) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        closeActions();
      }
    };

    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isRevealed]);

  const handleTouchStart = (e: TouchEvent) => {
    if (!isMobile) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    setIsAnimating(false);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isMobile) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartX.current - currentX;
    const diffY = Math.abs(touchStartY.current - currentY);

    // If vertical scroll is dominant, don't interfere
    if (diffY > Math.abs(diffX) && !isDragging.current) {
      return;
    }

    // Only start dragging if horizontal movement is significant
    if (Math.abs(diffX) > 10) {
      isDragging.current = true;
      e.preventDefault();
    }

    if (!isDragging.current) return;

    // Calculate new position
    let newTranslateX: number;

    if (isRevealed) {
      // Starting from revealed position
      newTranslateX = -ACTION_BUTTON_WIDTH - diffX;
    } else {
      // Starting from closed position
      newTranslateX = -diffX;
    }

    // Clamp values - allow slight overscroll for rubber band effect
    newTranslateX = Math.max(-ACTION_BUTTON_WIDTH - 20, newTranslateX);
    newTranslateX = Math.min(20, newTranslateX);

    setTranslateX(newTranslateX);
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging.current) return;

    setIsAnimating(true);

    // Determine if we should snap open or closed
    if (translateX < -SWIPE_THRESHOLD) {
      // Snap open
      setTranslateX(-ACTION_BUTTON_WIDTH);
      setIsRevealed(true);
    } else {
      // Snap closed
      setTranslateX(0);
      setIsRevealed(false);
    }

    isDragging.current = false;
  };

  const closeActions = () => {
    setIsAnimating(true);
    setTranslateX(0);
    setIsRevealed(false);
  };

  const formatDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // API calls for actions
  const addToWatchlist = async () => {
    if (actionInProgress) return;
    setActionInProgress("watchlist");

    try {
      const response = await fetch(`/api/content/${tmdb_id}/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add to watchlist");
      }

      showToast(`Added "${title}" to watchlist`, "success");
      closeActions();
      onActionComplete?.();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add to watchlist",
        "error",
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const markAsWatched = async () => {
    if (actionInProgress) return;
    setActionInProgress("watched");

    try {
      const response = await fetch(`/api/content/${tmdb_id}/watched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to mark as watched");
      }

      showToast(`Marked "${title}" as watched`, "success");
      closeActions();
      onActionComplete?.();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to mark as watched",
        "error",
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const addToFavourites = async () => {
    if (actionInProgress) return;
    setActionInProgress("favourite");

    try {
      const response = await fetch(`/api/content/${tmdb_id}/favourite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, is_favourite: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add to favourites");
      }

      showToast(`Added "${title}" to favourites`, "success");
      closeActions();
      onActionComplete?.();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add to favourites",
        "error",
      );
    } finally {
      setActionInProgress(null);
    }
  };

  // Determine which actions to show based on context
  const getActions = () => {
    switch (context) {
      case "watched":
        // Item is watched - can add to watchlist (to rewatch) or favourite
        return [
          {
            label: "Watchlist",
            icon: (
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            ),
            action: addToWatchlist,
            bgColor: "bg-blue-500",
            key: "watchlist",
          },
          {
            label: "Favourite",
            icon: (
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            ),
            action: addToFavourites,
            bgColor: "bg-pink-500",
            key: "favourite",
          },
        ];
      case "to_watch":
        // Item is on watchlist - can mark as watched or add to favourites
        return [
          {
            label: "Watched",
            icon: (
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ),
            action: markAsWatched,
            bgColor: "bg-green-500",
            key: "watched",
          },
          {
            label: "Favourite",
            icon: (
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            ),
            action: addToFavourites,
            bgColor: "bg-pink-500",
            key: "favourite",
          },
        ];
      case "favourites":
        // Item is favourited - can add to watchlist or mark as watched
        return [
          {
            label: "Watchlist",
            icon: (
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            ),
            action: addToWatchlist,
            bgColor: "bg-blue-500",
            key: "watchlist",
          },
          {
            label: "Watched",
            icon: (
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ),
            action: markAsWatched,
            bgColor: "bg-green-500",
            key: "watched",
          },
        ];
    }
  };

  const actions = getActions();

  // On desktop, render a simple link card
  if (!isMobile) {
    return (
      <a
        href={`/content/${tmdb_id}`}
        class="block group hover:scale-105 transition-transform"
      >
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
          <img
            src={getPosterUrl(poster_path, getGridPosterSize())}
            srcSet={getPosterSrcSet(poster_path)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            alt={title}
            class="w-full aspect-[2/3] object-cover"
            loading="lazy"
          />
          <div class="p-3">
            <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-indigo-600">
              {title}
            </h3>
            <div class="mt-2 space-y-1">
              <p class="text-xs text-gray-500">
                {dateLabel}: {formatDate(date)}
              </p>
              {rating !== null && (
                <p class="text-xs font-medium text-indigo-600">
                  ⭐ {rating.toFixed(1)}/10
                </p>
              )}
            </div>
          </div>
        </div>
      </a>
    );
  }

  // Mobile: Render swipeable card
  return (
    <div
      ref={cardRef}
      class="relative overflow-hidden rounded-lg"
      style={{ touchAction: "pan-y" }}
    >
      {/* Action buttons (revealed on swipe) */}
      <div
        class="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: `${ACTION_BUTTON_WIDTH}px` }}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              action.action();
            }}
            disabled={actionInProgress !== null}
            class={`flex-1 flex flex-col items-center justify-center text-white ${action.bgColor} ${
              actionInProgress === action.key ? "opacity-75" : "active:opacity-80"
            }`}
            aria-label={action.label}
          >
            {actionInProgress === action.key
              ? (
                <svg
                  class="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )
              : action.icon}
            <span class="text-xs mt-1 font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main card content (slides left on swipe) */}
      <div
        class={`relative bg-white shadow-md ${
          isAnimating ? "transition-transform duration-200 ease-out" : ""
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <a
          href={`/content/${tmdb_id}`}
          class="block"
          onClick={(e) => {
            // Prevent navigation if we just swiped
            if (isRevealed || isDragging.current) {
              e.preventDefault();
            }
          }}
        >
          <img
            src={getPosterUrl(poster_path, getGridPosterSize())}
            srcSet={getPosterSrcSet(poster_path)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            alt={title}
            class="w-full aspect-[2/3] object-cover"
            loading="lazy"
          />
          <div class="p-3">
            <h3 class="font-semibold text-sm text-gray-900 line-clamp-2">
              {title}
            </h3>
            <div class="mt-2 space-y-1">
              <p class="text-xs text-gray-500">
                {dateLabel}: {formatDate(date)}
              </p>
              {rating !== null && (
                <p class="text-xs font-medium text-indigo-600">
                  ⭐ {rating.toFixed(1)}/10
                </p>
              )}
            </div>
          </div>
        </a>

        {/* Swipe hint indicator (visible on first card only if needed) */}
        {!isRevealed && translateX === 0 && (
          <div class="absolute right-1 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
            <svg
              class="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
