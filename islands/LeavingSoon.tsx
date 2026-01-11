import { useEffect, useState } from "preact/hooks";
import {
  getGridPosterSize,
  getPosterSrcSet,
  getPosterUrl,
} from "../lib/images.ts";
import ContentGrid from "../components/ContentGrid.tsx";
import QuickActions from "./QuickActions.tsx";
import { useToast } from "./Toast.tsx";
import SkeletonCard from "../components/SkeletonCard.tsx";

interface LeavingSoonContent {
  tmdb_id: number;
  type: string;
  title: string;
  overview: string | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  available_until: string;
  service_id: string;
  service_name: string;
  service_logo: string | null;
  region: string;
}

interface StreamingService {
  id: string;
  name: string;
  logo_url: string | null;
}

interface LeavingSoonResponse {
  results: LeavingSoonContent[];
  streaming_services: StreamingService[];
  total_results: number;
}

/**
 * Leaving Soon section component
 * Displays content that is leaving streaming services soon
 */
export default function LeavingSoon() {
  const [content, setContent] = useState<LeavingSoonContent[]>([]);
  const [streamingServices, setStreamingServices] = useState<
    StreamingService[]
  >([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentStatuses, setContentStatuses] = useState<
    Record<number, "watched" | "to_watch" | "favourite" | null>
  >({});
  const { showToast, ToastContainer } = useToast();

  // Fetch leaving soon content
  const fetchLeavingSoon = async (serviceId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/leaving-soon", globalThis.location?.origin);
      if (serviceId) {
        url.searchParams.set("service_id", serviceId);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error("Failed to fetch leaving soon content");
      }

      const data: LeavingSoonResponse = await response.json();
      setContent(data.results || []);
      setStreamingServices(data.streaming_services || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching leaving soon content:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchLeavingSoon();
  }, []);

  // Handle streaming service filter change
  const handleServiceFilterChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    fetchLeavingSoon(serviceId || undefined);
  };

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

  // Format departure date to show relative time
  const formatDepartureDate = (availableUntil: string): string => {
    const date = new Date(availableUntil);
    const now = new Date();
    const daysDiff = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff <= 0) {
      return "Leaving today!";
    } else if (daysDiff === 1) {
      return "Leaving tomorrow";
    } else if (daysDiff <= 7) {
      return `Leaving in ${daysDiff} days`;
    } else if (daysDiff <= 14) {
      const weeks = Math.floor(daysDiff / 7);
      return `Leaving in ${weeks} week${weeks !== 1 ? "s" : ""}`;
    } else {
      return date.toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Get urgency colour class based on days remaining
  const getUrgencyColour = (availableUntil: string): string => {
    const date = new Date(availableUntil);
    const now = new Date();
    const daysDiff = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff <= 3) {
      return "bg-red-600"; // Urgent - leaving very soon
    } else if (daysDiff <= 7) {
      return "bg-orange-500"; // Warning - leaving this week
    } else {
      return "bg-yellow-500"; // Notice - leaving soon
    }
  };

  return (
    <section class="mb-12">
      <ToastContainer />
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Leaving Soon</h2>
          <p class="text-sm text-gray-600 mt-1">
            Catch these before they're gone
          </p>
        </div>

        {/* Streaming Service Filter */}
        {streamingServices.length > 0 && (
          <div class="flex items-center gap-2">
            <label
              htmlFor="service-filter"
              class="text-sm font-medium text-gray-700"
            >
              Filter by service:
            </label>
            <select
              id="service-filter"
              value={selectedServiceId}
              onChange={(e) =>
                handleServiceFilterChange(
                  (e.target as HTMLSelectElement).value,
                )}
              class="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Services</option>
              {streamingServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
          {content.map((item) => (
            <a
              href={`/content/${item.tmdb_id}`}
              class="block group relative hover:scale-105 transition-transform"
              key={`${item.type}-${item.tmdb_id}-${item.service_id}`}
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
                  width="300"
                  height="450"
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
                {/* Departure Date Badge */}
                <div class="absolute top-2 left-2">
                  <span
                    class={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-white ${
                      getUrgencyColour(item.available_until)
                    }`}
                    title={`Leaving on ${
                      new Date(item.available_until).toLocaleDateString(
                        "en-GB",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      )
                    }`}
                  >
                    {formatDepartureDate(item.available_until)}
                  </span>
                </div>
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
                    {/* Streaming Service Logo/Name */}
                    <div class="flex items-center gap-1">
                      {item.service_logo
                        ? (
                          <img
                            src={item.service_logo}
                            alt={item.service_name}
                            class="h-4 w-4 object-contain rounded"
                            title={item.service_name}
                          />
                        )
                        : (
                          <span class="text-xs text-gray-500">
                            {item.service_name}
                          </span>
                        )}
                      {item.service_logo && (
                        <span class="text-xs text-gray-500">
                          {item.service_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </ContentGrid>
      )}

      {/* Empty State */}
      {!loading && !error && content.length === 0 && (
        <div class="text-center py-8 bg-gray-50 rounded-lg">
          <p class="text-gray-600">
            {selectedServiceId
              ? "No content leaving this streaming service soon."
              : "No content leaving streaming services soon."}
          </p>
        </div>
      )}
    </section>
  );
}
