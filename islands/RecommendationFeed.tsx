import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import type { RecommendationCandidate } from "../lib/ai/recommendations.ts";

interface RecommendationsResponse {
  recommendations: RecommendationCandidate[];
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
  const [watchlistStatuses, setWatchlistStatuses] = useState<
    Record<number, boolean>
  >({});
  const [loadingWatchlist, setLoadingWatchlist] = useState<
    Record<number, boolean>
  >({});

  // Fetch recommendations on mount
  useEffect(() => {
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
          throw new Error("Failed to fetch recommendations");
        }

        const data: RecommendationsResponse = await response.json();
        setRecommendations(data.recommendations || []);

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

  // Helper function to get poster image URL
  const getPosterUrl = (posterPath: string | null): string => {
    if (!posterPath) {
      return "https://via.placeholder.com/300x450?text=No+Poster";
    }
    return `https://image.tmdb.org/t/p/w300${posterPath}`;
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
      alert("Failed to dismiss recommendation. Please try again.");
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
        alert(
          response.status === 401
            ? "Please log in to add items to your watchlist"
            : "Failed to update watchlist. Please try again.",
        );
      }
    } catch (err) {
      // Revert on error
      setWatchlistStatuses((prev) => ({
        ...prev,
        [tmdbId]: currentStatus,
      }));
      console.error("Error updating watchlist:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoadingWatchlist((prev) => {
        const updated = { ...prev };
        delete updated[tmdbId];
        return updated;
      });
    }
  };

  return (
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">
            Recommendations for You
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            Personalised recommendations based on your viewing history
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div class="text-center py-8">
          <p class="text-gray-600">Loading recommendations...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div class="text-center py-8">
          <p class="text-red-600">Error: {error}</p>
          <p class="text-sm text-gray-500 mt-2">
            Make sure you've watched and rated some content to get
            recommendations.
          </p>
        </div>
      )}

      {/* Recommendations Grid */}
      {!loading && !error && recommendations.length > 0 && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <div
              class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative group"
              key={`${rec.type}-${rec.tmdb_id}`}
            >
              <a href={`/content/${rec.tmdb_id}`} class="block">
                <div class="relative">
                  <img
                    src={getPosterUrl(rec.poster_path)}
                    alt={rec.title}
                    class="w-full aspect-[2/3] object-cover"
                    loading="lazy"
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
              {/* Add to Watchlist button */}
              <button
                type="button"
                onClick={(e) => handleWatchlistToggle(e, rec.tmdb_id)}
                disabled={loadingWatchlist[rec.tmdb_id]}
                class={`absolute bottom-4 right-4 px-3 py-1.5 rounded-lg text-sm font-medium transition-all opacity-0 group-hover:opacity-100 ${
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
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recommendations.length === 0 && (
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
