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
import SkeletonCard from "../components/SkeletonCard.tsx";

interface NewReleasesResponse {
  results: Content[];
  total_results: number;
  page: number;
  total_pages: number;
}

interface ProviderAvailability {
  provider_ids: number[];
  providers: Array<{
    provider_id: number;
    provider_name: string;
  }>;
}

interface ProviderAvailabilityResponse {
  availability: Record<number, ProviderAvailability>;
}

/**
 * New Releases section component
 * Displays fresh content with recent release dates and streaming availability
 */
export default function NewReleases() {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingAvailability, setStreamingAvailability] = useState<
    Record<number, ProviderAvailability>
  >({});
  const [contentStatuses, setContentStatuses] = useState<
    Record<number, "watched" | "to_watch" | "favourite" | null>
  >({});
  const { showToast, ToastContainer } = useToast();

  // Fetch new releases and streaming availability on mount
  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/new-releases");

        if (!response.ok) {
          throw new Error("Failed to fetch new releases");
        }

        const data: NewReleasesResponse = await response.json();
        const releases = data.results || [];

        // Fetch streaming availability for all releases
        if (releases.length > 0) {
          try {
            const providersResponse = await fetch("/api/search/providers", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                content: releases.map((item) => ({
                  tmdb_id: item.tmdb_id,
                  type: item.type,
                })),
              }),
            });

            if (providersResponse.ok) {
              const providersData: ProviderAvailabilityResponse =
                await providersResponse.json();
              setStreamingAvailability(providersData.availability || {});
            }
          } catch (providersError) {
            // Silently fail - streaming availability is optional
            console.error(
              "Failed to fetch streaming availability:",
              providersError,
            );
          }
        }

        setContent(releases);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching new releases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNewReleases();
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

  // Format release date to show relative time or date
  const formatReleaseDate = (releaseDate: string | null): string => {
    if (!releaseDate) return "";
    const date = new Date(releaseDate);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff < 0) {
      return `Coming ${Math.abs(daysDiff)} day${
        Math.abs(daysDiff) !== 1 ? "s" : ""
      }`;
    } else if (daysDiff === 0) {
      return "Released today";
    } else if (daysDiff < 7) {
      return `${daysDiff} day${daysDiff !== 1 ? "s" : ""} ago`;
    } else if (daysDiff < 30) {
      const weeks = Math.floor(daysDiff / 7);
      return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  return (
    <section class="mb-12">
      <ToastContainer />
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">New Releases</h2>
          <p class="text-sm text-gray-600 mt-1">
            Fresh content with recent release dates
          </p>
        </div>
      </div>

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

      {/* Content Grid */}
      {!loading && !error && content.length > 0 && (
        <ContentGrid>
          {content.map((item) => {
            const availability = streamingAvailability[item.tmdb_id];
            const hasStreaming = availability &&
              availability.provider_ids &&
              availability.provider_ids.length > 0;

            return (
              <a
                href={`/content/${item.tmdb_id}`}
                class="block group relative hover:scale-105 transition-transform"
                key={`${item.type}-${item.tmdb_id}`}
                onMouseEnter={() => fetchContentStatus(item.tmdb_id)}
              >
                <div class="bg-white rounded-lg shadow-md overflow-hidden relative">
                  <img
                    src={getPosterUrl(item.poster_path, getGridPosterSize())}
                    srcSet={getPosterSrcSet(item.poster_path)}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    alt={item.title}
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
                      tmdbId={item.tmdb_id}
                      initialStatus={contentStatuses[item.tmdb_id] || null}
                      onAction={(action, success) =>
                        handleQuickAction(
                          action,
                          success,
                          item.title,
                          item.tmdb_id,
                        )}
                    />
                  </div>
                  {/* Streaming Availability Badge */}
                  {hasStreaming && (
                    <div class="absolute top-2 left-2">
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-600 text-white"
                        title="Available on streaming services"
                      >
                        Streaming
                      </span>
                    </div>
                  )}
                  {/* Content Type Badge */}
                  <div class="absolute top-2 right-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white uppercase">
                      {item.type}
                    </span>
                  </div>
                  <div class="p-3">
                    <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-indigo-600">
                      {item.title}
                    </h3>
                    <div class="flex items-center justify-between mt-2">
                      {item.release_date && (
                        <span class="text-xs text-gray-500">
                          {formatReleaseDate(item.release_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </ContentGrid>
      )}

      {/* Empty State */}
      {!loading && !error && content.length === 0 && (
        <div class="text-center py-8 bg-gray-50 rounded-lg">
          <p class="text-gray-600">No new releases available.</p>
        </div>
      )}
    </section>
  );
}
