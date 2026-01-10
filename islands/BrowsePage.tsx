import { useEffect, useState } from "preact/hooks";
import type { Content } from "../lib/tmdb/client.ts";
import {
  getGridPosterSize,
  getPosterSrcSet,
  getPosterUrl,
} from "../lib/images.ts";
import ContentGrid from "../components/ContentGrid.tsx";
import QuickActions from "./QuickActions.tsx";
import { useToast } from "./Toast.tsx";
import NewReleases from "./NewReleases.tsx";
import LeavingSoon from "./LeavingSoon.tsx";
import SkeletonCard from "../components/SkeletonCard.tsx";

interface TrendingResponse {
  results: Content[];
  total_results: number;
  page: number;
  total_pages: number;
}

/**
 * Browse page island component
 * Displays trending content and other browse sections
 */
export default function BrowsePage() {
  const [trending, setTrending] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentStatuses, setContentStatuses] = useState<
    Record<number, "watched" | "to_watch" | "favourite" | null>
  >({});
  const { showToast, ToastContainer } = useToast();

  // Fetch trending content on mount
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/trending?time_window=day&page=1");

        if (!response.ok) {
          throw new Error("Failed to fetch trending content");
        }

        const data: TrendingResponse = await response.json();
        setTrending(data.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  // Fetch content status when hovering over a card
  const fetchContentStatus = async (tmdbId: number) => {
    // Skip if already fetched
    if (contentStatuses[tmdbId] !== undefined) return;

    try {
      const response = await fetch(`/api/content/${tmdbId}/status`);
      if (response.ok) {
        const data = await response.json();
        setContentStatuses((prev) => ({
          ...prev,
          [tmdbId]: data.status || null,
        }));
      }
    } catch (error) {
      // Silently fail - user might not be authenticated
      console.error("Failed to fetch content status:", error);
    }
  };

  // Handle quick action callbacks
  const handleQuickAction = (
    action: string,
    success: boolean,
    contentTitle: string,
    tmdbId: number,
  ) => {
    if (success) {
      // Fetch updated status from server
      fetch(`/api/content/${tmdbId}/status`)
        .then((res) => res.ok && res.json())
        .then((data) => {
          if (data) {
            setContentStatuses((prev) => ({
              ...prev,
              [tmdbId]: data.status || null,
            }));
          }
        })
        .catch(() => {
          // Silently fail
        });

      const messages: Record<string, string> = {
        watchlist: "Added to watchlist",
        favourite: "Added to favourites",
        watched: "Marked as watched",
      };
      showToast(
        `${messages[action] || "Action completed"}: ${contentTitle}`,
        "success",
      );
    } else {
      const errorMessages: Record<string, string> = {
        watchlist: "Failed to update watchlist",
        favourite: "Failed to update favourites",
        watched: "Failed to update watched status",
      };
      showToast(
        errorMessages[action] || "Failed to update. Please try again.",
        "error",
      );
    }
  };

  return (
    <div>
      <ToastContainer />
      {/* New Releases Section */}
      <NewReleases />
      {/* Leaving Soon Section */}
      <LeavingSoon />
      {/* Trending Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Trending</h2>

        {/* Loading State - Skeleton Cards */}
        {loading && (
          <ContentGrid>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </ContentGrid>
        )}

        {/* Error State */}
        {error && !loading && (
          <div class="text-center py-8">
            <p class="text-red-600">Error: {error}</p>
          </div>
        )}

        {/* Trending Content Grid */}
        {!loading && !error && trending.length > 0 && (
          <ContentGrid>
            {trending.map((content) => (
              <a
                href={`/content/${content.tmdb_id}`}
                class="block group relative hover:scale-105 transition-transform"
                key={`${content.type}-${content.tmdb_id}`}
                onMouseEnter={() => fetchContentStatus(content.tmdb_id)}
              >
                <div class="bg-white rounded-lg shadow-md overflow-hidden relative">
                  <img
                    src={getPosterUrl(content.poster_path, getGridPosterSize())}
                    srcSet={getPosterSrcSet(content.poster_path)}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    alt={content.title}
                    class="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                  />
                  {/* Quick Actions Overlay */}
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <QuickActions
                      tmdbId={content.tmdb_id}
                      initialStatus={contentStatuses[content.tmdb_id] || null}
                      onAction={(action, success) =>
                        handleQuickAction(
                          action,
                          success,
                          content.title,
                          content.tmdb_id,
                        )}
                    />
                  </div>
                  <div class="p-3">
                    <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-indigo-600">
                      {content.title}
                    </h3>
                    <div class="flex items-center justify-between mt-2">
                      <span class="text-xs text-gray-500 uppercase">
                        {content.type}
                      </span>
                      {content.release_date && (
                        <span class="text-xs text-gray-500">
                          {new Date(content.release_date).getFullYear()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </ContentGrid>
        )}

        {/* Empty State */}
        {!loading && !error && trending.length === 0 && (
          <div class="text-center py-8">
            <p class="text-gray-600">No trending content available</p>
          </div>
        )}
      </section>
    </div>
  );
}
