import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import type { RecommendationCandidate } from "../lib/ai/recommendations.ts";
import {
  getGridPosterSize,
  getPosterSrcSet,
  getPosterUrl,
} from "../lib/images.ts";
import RecommendationChat from "./RecommendationChat.tsx";
import { useToast } from "./Toast.tsx";
import ErrorDisplay from "../components/ErrorDisplay.tsx";

interface RecommendationsResponse {
  recommendations: RecommendationCandidate[];
  rateLimitReached?: boolean;
  remainingRecommendations?: number;
  upgradePrompt?: string;
}

/**
 * Recommendation feed island component
 * Displays daily personalised recommendations with explanations
 */
export default function RecommendationFeed() {
  const [recommendations, setRecommendations] = useState<
    RecommendationCandidate[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitReached, setRateLimitReached] = useState(false);
  const [remainingRecommendations, setRemainingRecommendations] = useState<
    number | null
  >(null);
  const [upgradePrompt, setUpgradePrompt] = useState<string | null>(null);
  const [watchlistStatuses, setWatchlistStatuses] = useState<
    Record<number, boolean>
  >({});
  const [loadingWatchlist, setLoadingWatchlist] = useState<
    Record<number, boolean>
  >({});
  const [isPremium, setIsPremium] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [generalChatOpen, setGeneralChatOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<
    {
      tmdbId: number;
      title: string;
    } | null
  >(null);
  const { showToast, ToastContainer } = useToast();

  // Fetch premium status on mount
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      if (!IS_BROWSER) return;

      try {
        const response = await fetch("/api/user/premium");
        if (response.ok) {
          const data = await response.json();
          setIsPremium(data.isPremium || false);
        }
      } catch (err) {
        // Silently fail - user might not be authenticated
        console.error("Error fetching premium status:", err);
      }
    };

    fetchPremiumStatus();
  }, []);

  // Fetch recommendations function (extracted for reuse in retry)
  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/recommendations");

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, but this shouldn't happen if component is only shown to authenticated users
          throw new Error("Please log in to see recommendations");
        }
        if (response.status === 403) {
          // Rate limit reached
          const data: RecommendationsResponse = await response.json();
          setRateLimitReached(true);
          setRemainingRecommendations(data.remainingRecommendations || 0);
          setUpgradePrompt(data.upgradePrompt || null);
          setRecommendations([]);
          return;
        }
        throw new Error("Failed to fetch recommendations");
      }

      const data: RecommendationsResponse = await response.json();
      setRecommendations(data.recommendations || []);
      setRateLimitReached(data.rateLimitReached || false);
      setRemainingRecommendations(data.remainingRecommendations ?? null);
      setUpgradePrompt(data.upgradePrompt || null);

      // Fetch watchlist statuses for all recommendations
      if (data.recommendations && data.recommendations.length > 0) {
        fetchWatchlistStatuses(data.recommendations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommendations on mount
  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Fetch watchlist statuses for recommendations
  const fetchWatchlistStatuses = async (
    recs: RecommendationCandidate[],
  ) => {
    if (!IS_BROWSER) return;

    // Fetch statuses in parallel
    const statusPromises = recs.map(async (rec) => {
      try {
        const response = await fetch(`/api/content/${rec.tmdb_id}/status`);
        if (response.ok) {
          const data = await response.json();
          return {
            tmdbId: rec.tmdb_id,
            isInWatchlist: data.status === "to_watch",
          };
        }
      } catch (error) {
        // Silently fail - user might not be authenticated
        console.error(
          `Failed to fetch status for ${rec.tmdb_id}:`,
          error,
        );
      }
      return { tmdbId: rec.tmdb_id, isInWatchlist: false };
    });

    const statuses = await Promise.all(statusPromises);
    const statusMap: Record<number, boolean> = {};
    statuses.forEach(({ tmdbId, isInWatchlist }) => {
      statusMap[tmdbId] = isInWatchlist;
    });
    setWatchlistStatuses(statusMap);
  };

  // Handle dismissing a recommendation
  const handleDismiss = async (
    e: Event,
    tmdbId: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic update - remove from UI immediately
    const originalRecommendations = [...recommendations];
    setRecommendations((prev) => prev.filter((rec) => rec.tmdb_id !== tmdbId));

    try {
      const response = await fetch(`/api/recommendations/${tmdbId}/dismiss`, {
        method: "POST",
      });

      if (!response.ok) {
        // Revert on error
        setRecommendations(originalRecommendations);
        throw new Error("Failed to dismiss recommendation");
      }
    } catch (err) {
      // Revert on error
      setRecommendations(originalRecommendations);
      console.error("Error dismissing recommendation:", err);
      showToast("Failed to dismiss recommendation. Please try again.", "error");
    }
  };

  // Handle adding/removing from watchlist
  const handleWatchlistToggle = async (
    e: Event,
    tmdbId: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!IS_BROWSER || loadingWatchlist[tmdbId]) return;

    const currentStatus = watchlistStatuses[tmdbId] || false;
    const newStatus = !currentStatus;

    // Optimistic update
    setWatchlistStatuses((prev) => ({
      ...prev,
      [tmdbId]: newStatus,
    }));
    setLoadingWatchlist((prev) => ({
      ...prev,
      [tmdbId]: true,
    }));

    try {
      const method = newStatus ? "POST" : "DELETE";
      const response = await fetch(`/api/content/${tmdbId}/watchlist`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Revert on error
        setWatchlistStatuses((prev) => ({
          ...prev,
          [tmdbId]: currentStatus,
        }));
        const error = await response.json();
        console.error("Failed to update watchlist:", error);
        const errorMessage = response.status === 401
          ? "Please log in to add items to your watchlist"
          : "Failed to update watchlist. Please try again.";
        showToast(errorMessage, "error");
      } else {
        // Show success toast with undo
        const message = newStatus
          ? "Added to watchlist"
          : "Removed from watchlist";
        showToast(
          message,
          "success",
          3000,
          newStatus
            ? () => {
              // Undo: remove from watchlist
              fetch(`/api/content/${tmdbId}/watchlist`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              }).then(() => {
                setWatchlistStatuses((prev) => ({
                  ...prev,
                  [tmdbId]: false,
                }));
              });
            }
            : () => {
              // Undo: add back to watchlist
              fetch(`/api/content/${tmdbId}/watchlist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              }).then(() => {
                setWatchlistStatuses((prev) => ({
                  ...prev,
                  [tmdbId]: true,
                }));
              });
            },
        );
      }
    } catch (err) {
      // Revert on error
      setWatchlistStatuses((prev) => ({
        ...prev,
        [tmdbId]: currentStatus,
      }));
      console.error("Error updating watchlist:", err);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setLoadingWatchlist((prev) => {
        const updated = { ...prev };
        delete updated[tmdbId];
        return updated;
      });
    }
  };

  // Handle opening chat
  const handleOpenChat = (e: Event, rec: RecommendationCandidate) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRecommendation({
      tmdbId: rec.tmdb_id,
      title: rec.title,
    });
    setChatOpen(true);
  };

  // Handle closing chat
  const handleCloseChat = () => {
    setChatOpen(false);
    setSelectedRecommendation(null);
  };

  return (
    <section class="mb-12">
      <ToastContainer />
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">
            Recommendations for You
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            Personalised recommendations based on your viewing history
          </p>
        </div>
        {isPremium && (
          <button
            type="button"
            onClick={() => setGeneralChatOpen(true)}
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Ask for Recommendations
          </button>
        )}
      </div>

      {/* Loading State - Skeleton Cards */}
      {loading && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              class="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
            >
              <div class="w-full aspect-[2/3] bg-gray-300" />
              <div class="p-4">
                <div class="h-6 bg-gray-300 rounded mb-2" />
                <div class="h-4 bg-gray-200 rounded mb-3 w-1/3" />
                <div class="space-y-2 mb-3">
                  <div class="h-3 bg-gray-200 rounded w-full" />
                  <div class="h-3 bg-gray-200 rounded w-5/6" />
                  <div class="h-3 bg-gray-200 rounded w-4/6" />
                </div>
                <div class="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorDisplay
          message={error}
          helpText="Make sure you've watched and rated some content to get recommendations."
          onRetry={fetchRecommendations}
        />
      )}

      {/* Rate Limit Reached State */}
      {rateLimitReached && !loading && !error && (
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg
                class="h-5 w-5 text-yellow-600"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-yellow-800">
                Daily Recommendation Limit Reached
              </h3>
              <div class="mt-2 text-sm text-yellow-700">
                <p>
                  {upgradePrompt ||
                    "You've reached your daily limit of 3 AI recommendations."}
                </p>
                {remainingRecommendations !== null &&
                  remainingRecommendations === 0 && (
                  <p class="mt-2">
                    Your limit will reset in 24 hours. Upgrade to premium for
                    unlimited recommendations.
                  </p>
                )}
              </div>
              {!isPremium && (
                <div class="mt-4">
                  <a
                    href="/premium"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Upgrade to Premium
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Grid */}
      {!loading && !error && !rateLimitReached && recommendations.length > 0 &&
        (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec) => (
              <div
                class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative group"
                key={`${rec.type}-${rec.tmdb_id}`}
              >
                <a href={`/content/${rec.tmdb_id}`} class="block">
                  <div class="relative">
                    <img
                      src={getPosterUrl(rec.poster_path, getGridPosterSize())}
                      srcSet={getPosterSrcSet(rec.poster_path)}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      alt={rec.title}
                      class="w-full aspect-[2/3] object-cover"
                      loading="lazy"
                      width="300"
                      height="450"
                    />
                    <div class="absolute top-2 right-2 flex gap-2">
                      <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white uppercase">
                        {rec.type}
                      </span>
                    </div>
                  </div>
                  <div class="p-4">
                    <h3 class="font-semibold text-lg text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {rec.title}
                    </h3>
                    {rec.release_date && (
                      <p class="text-sm text-gray-500 mb-3">
                        {new Date(rec.release_date).getFullYear()}
                      </p>
                    )}
                    {rec.explanation && (
                      <p class="text-sm text-gray-700 mb-3 line-clamp-3">
                        {rec.explanation}
                      </p>
                    )}
                    <div class="flex items-center justify-between mt-4">
                      <span class="text-xs text-gray-500">
                        View details →
                      </span>
                      {rec.similarity && (
                        <span class="text-xs text-indigo-600 font-medium">
                          {Math.round(rec.similarity * 100)}% match
                        </span>
                      )}
                    </div>
                  </div>
                </a>
                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={(e) => handleDismiss(e, rec.tmdb_id)}
                  class="absolute top-2 left-2 bg-gray-800 bg-opacity-75 hover:bg-opacity-90 text-white rounded-full p-2 transition-opacity opacity-0 group-hover:opacity-100"
                  aria-label="Not interested"
                  title="Not interested"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                {/* Action buttons */}
                <div class="absolute bottom-4 right-4 flex gap-2">
                  {/* Tell me more button (premium only) */}
                  {isPremium && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenChat(e, rec)}
                      class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all opacity-0 group-hover:opacity-100 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                      aria-label="Tell me more about this recommendation"
                      title="Tell me more"
                    >
                      Tell me more
                    </button>
                  )}
                  {/* Add to Watchlist button */}
                  <button
                    type="button"
                    onClick={(e) => handleWatchlistToggle(e, rec.tmdb_id)}
                    disabled={loadingWatchlist[rec.tmdb_id]}
                    class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all opacity-0 group-hover:opacity-100 ${
                      watchlistStatuses[rec.tmdb_id]
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-white text-gray-800 hover:bg-gray-100 shadow-md"
                    } ${
                      loadingWatchlist[rec.tmdb_id]
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    aria-label={watchlistStatuses[rec.tmdb_id]
                      ? "Remove from watchlist"
                      : "Add to watchlist"}
                    title={watchlistStatuses[rec.tmdb_id]
                      ? "Remove from watchlist"
                      : "Add to watchlist"}
                  >
                    {loadingWatchlist[rec.tmdb_id]
                      ? "Loading..."
                      : watchlistStatuses[rec.tmdb_id]
                      ? "✓ In Watchlist"
                      : "Add to Watchlist"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Chat interface */}
      {chatOpen && selectedRecommendation && (
        <RecommendationChat
          tmdbId={selectedRecommendation.tmdbId}
          contentTitle={selectedRecommendation.title}
          isOpen={chatOpen}
          onClose={handleCloseChat}
        />
      )}

      {/* General Chat Modal for mood-based recommendations */}
      {generalChatOpen && (
        <RecommendationChat
          isOpen={generalChatOpen}
          onClose={() => {
            setGeneralChatOpen(false);
          }}
        />
      )}

      {/* Remaining Recommendations Info */}
      {!loading &&
        !error &&
        !rateLimitReached &&
        remainingRecommendations !== null &&
        remainingRecommendations < 3 && (
        <div class="mb-4 text-sm text-gray-600">
          <p>
            {remainingRecommendations === 0
              ? "You've used all your daily recommendations."
              : `You have ${remainingRecommendations} recommendation${
                remainingRecommendations === 1 ? "" : "s"
              } remaining today.`}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading &&
        !error &&
        !rateLimitReached &&
        recommendations.length === 0 && (
        <div class="text-center py-12 bg-gray-50 rounded-lg">
          <p class="text-gray-600 mb-2">
            No recommendations available yet.
          </p>
          <p class="text-sm text-gray-500">
            Watch and rate some content to get personalised recommendations.
          </p>
        </div>
      )}
    </section>
  );
}
