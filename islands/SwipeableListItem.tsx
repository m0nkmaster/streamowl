import { useEffect, useRef, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface SwipeableListItemProps {
  tmdbId: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  posterPath: string | null;
  subtitle?: string;
  rating?: number | null;
  href: string;
  /** Called when an action completes */
  onAction?: (action: string, success: boolean) => void;
  /** Called when item should be removed from list */
  onRemove?: () => void;
  /** Current tab context for appropriate actions */
  currentTab?: "watched" | "to_watch" | "favourites";
}

/**
 * Swipeable list item for mobile devices
 * Swipe left to reveal quick actions (watchlist, favourite, watched, remove)
 */
export default function SwipeableListItem({
  tmdbId,
  type: _type,
  title,
  posterPath,
  subtitle,
  rating,
  href,
  onAction,
  onRemove,
  currentTab,
}: SwipeableListItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  // Action panel width - shows 3 action buttons
  const ACTION_PANEL_WIDTH = 160;
  const SWIPE_THRESHOLD = 60;

  const getPosterUrl = (path: string | null): string => {
    if (!path) {
      return "https://via.placeholder.com/92x138/374151/9CA3AF?text=No+Image";
    }
    return `https://image.tmdb.org/t/p/w92${path}`;
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!IS_BROWSER) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !IS_BROWSER) return;

    const diffX = e.touches[0].clientX - startXRef.current;
    const newTranslateX = currentXRef.current + diffX;

    // Limit the swipe range - can only swipe left, with resistance at boundaries
    if (newTranslateX > 0) {
      // Apply resistance when swiping right past origin
      setTranslateX(newTranslateX * 0.3);
    } else if (newTranslateX < -ACTION_PANEL_WIDTH) {
      // Apply resistance when swiping too far left
      const overflow = newTranslateX + ACTION_PANEL_WIDTH;
      setTranslateX(-ACTION_PANEL_WIDTH + overflow * 0.3);
    } else {
      setTranslateX(newTranslateX);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !IS_BROWSER) return;
    setIsDragging(false);

    // Snap to open or closed state
    if (translateX < -SWIPE_THRESHOLD) {
      setTranslateX(-ACTION_PANEL_WIDTH);
    } else {
      setTranslateX(0);
    }
  };

  // Close swipe when clicking elsewhere
  useEffect(() => {
    if (!IS_BROWSER) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setTranslateX(0);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleAction = async (
    action: "watchlist" | "favourite" | "watched" | "remove",
    e: Event,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!IS_BROWSER || isLoading) return;

    // For remove action, just trigger the callback
    if (action === "remove") {
      setIsLoading(action);

      // Determine API endpoint based on current tab
      let endpoint: string;
      if (currentTab === "watched") {
        endpoint = `/api/content/${tmdbId}/watched`;
      } else if (currentTab === "to_watch") {
        endpoint = `/api/content/${tmdbId}/watchlist`;
      } else if (currentTab === "favourites") {
        endpoint = `/api/content/${tmdbId}/favourite`;
      } else {
        setIsLoading(null);
        return;
      }

      try {
        const response = await fetch(endpoint, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          onRemove?.();
          onAction?.(action, true);
        } else {
          console.error("Failed to remove item");
          onAction?.(action, false);
        }
      } catch (error) {
        console.error("Error removing item:", error);
        onAction?.(action, false);
      } finally {
        setIsLoading(null);
        setTranslateX(0);
      }
      return;
    }

    setIsLoading(action);

    const endpoints: Record<string, string> = {
      watchlist: `/api/content/${tmdbId}/watchlist`,
      favourite: `/api/content/${tmdbId}/favourite`,
      watched: `/api/content/${tmdbId}/watched`,
    };

    try {
      const response = await fetch(endpoints[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        onAction?.(action, true);
        // Close the swipe panel after successful action
        setTranslateX(0);
      } else {
        let errorMessage = "Action failed";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
        console.error(`${action} failed:`, errorMessage);
        onAction?.(action, false);
      }
    } catch (error) {
      console.error(`${action} failed:`, error);
      onAction?.(action, false);
    } finally {
      setIsLoading(null);
    }
  };

  const isOpen = translateX < -SWIPE_THRESHOLD;

  return (
    <div
      ref={containerRef}
      class="relative overflow-hidden bg-white rounded-lg shadow-sm mb-2 touch-pan-y"
    >
      {/* Action buttons revealed on swipe */}
      <div
        class="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: `${ACTION_PANEL_WIDTH}px` }}
      >
        {/* Different actions based on current tab */}
        {currentTab === "to_watch" && (
          <>
            {/* Mark as Watched */}
            <button
              type="button"
              onClick={(e) => handleAction("watched", e)}
              disabled={isLoading === "watched"}
              class="flex-1 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white transition-colors"
              aria-label="Mark as watched"
              title="Mark as watched"
            >
              {isLoading === "watched"
                ? (
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )
                : (
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
                )}
            </button>

            {/* Add to Favourites */}
            <button
              type="button"
              onClick={(e) => handleAction("favourite", e)}
              disabled={isLoading === "favourite"}
              class="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors"
              aria-label="Add to favourites"
              title="Add to favourites"
            >
              {isLoading === "favourite"
                ? (
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )
                : (
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
                )}
            </button>
          </>
        )}

        {currentTab === "watched" && (
          <>
            {/* Add to Watchlist */}
            <button
              type="button"
              onClick={(e) => handleAction("watchlist", e)}
              disabled={isLoading === "watchlist"}
              class="flex-1 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
              aria-label="Add to watchlist"
              title="Add to watchlist"
            >
              {isLoading === "watchlist"
                ? (
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )
                : (
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
                )}
            </button>

            {/* Add to Favourites */}
            <button
              type="button"
              onClick={(e) => handleAction("favourite", e)}
              disabled={isLoading === "favourite"}
              class="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-colors"
              aria-label="Add to favourites"
              title="Add to favourites"
            >
              {isLoading === "favourite"
                ? (
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )
                : (
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
                )}
            </button>
          </>
        )}

        {currentTab === "favourites" && (
          <>
            {/* Add to Watchlist */}
            <button
              type="button"
              onClick={(e) => handleAction("watchlist", e)}
              disabled={isLoading === "watchlist"}
              class="flex-1 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
              aria-label="Add to watchlist"
              title="Add to watchlist"
            >
              {isLoading === "watchlist"
                ? (
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )
                : (
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
                )}
            </button>

            {/* Mark as Watched */}
            <button
              type="button"
              onClick={(e) => handleAction("watched", e)}
              disabled={isLoading === "watched"}
              class="flex-1 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white transition-colors"
              aria-label="Mark as watched"
              title="Mark as watched"
            >
              {isLoading === "watched"
                ? (
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )
                : (
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
                )}
            </button>
          </>
        )}

        {/* Remove from current list - always available */}
        <button
          type="button"
          onClick={(e) => handleAction("remove", e)}
          disabled={isLoading === "remove"}
          class="flex-1 flex items-center justify-center bg-gray-700 hover:bg-gray-800 text-white transition-colors"
          aria-label="Remove from list"
          title="Remove from list"
        >
          {isLoading === "remove"
            ? (
              <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )
            : (
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
        </button>
      </div>

      {/* Main content - slides left on swipe */}
      <a
        href={href}
        class="block relative z-10 bg-white"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // Prevent navigation when swiped open
          if (isOpen) {
            e.preventDefault();
            setTranslateX(0);
          }
        }}
      >
        <div class="flex items-center p-3 gap-3">
          {/* Poster thumbnail */}
          <img
            src={getPosterUrl(posterPath)}
            alt={title}
            class="w-12 h-18 object-cover rounded flex-shrink-0"
            width="48"
            height="72"
            loading="lazy"
          />

          {/* Content info */}
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 text-sm line-clamp-1">
              {title}
            </h3>
            {subtitle && (
              <p class="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
            {rating !== null && rating !== undefined && (
              <p class="text-xs font-medium text-indigo-600 mt-1">
                ⭐ {rating.toFixed(1)}/10
              </p>
            )}
          </div>

          {/* Swipe indicator */}
          <div class="flex-shrink-0 text-gray-400">
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </a>
    </div>
  );
}
