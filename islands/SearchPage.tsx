import { useEffect, useState } from "preact/hooks";
import type { Content } from "../lib/tmdb/client.ts";
import ContentGrid from "../components/ContentGrid.tsx";
import QuickActions from "./QuickActions.tsx";
import { useToast } from "./Toast.tsx";
import SkeletonCard from "../components/SkeletonCard.tsx";

interface SearchResponse {
  results: Content[];
  total_results: number;
  page: number;
  total_pages: number;
}

/**
 * TMDB genre ID to name mapping
 * Common genres for both movies and TV shows
 */
const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

/**
 * Streaming service options for filter dropdown
 */
const STREAMING_SERVICES = [
  { id: 8, name: "Netflix" },
  { id: 9, name: "Amazon Prime Video" },
  { id: 15, name: "Hulu" },
  { id: 337, name: "Disney+" },
  { id: 350, name: "Apple TV+" },
  { id: 384, name: "HBO Max" },
  { id: 386, name: "Peacock" },
  { id: 531, name: "Paramount+" },
].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Search page island component
 * Handles search input with debouncing and displays results
 */
type ContentTypeFilter = "all" | "movie" | "tv";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ContentTypeFilter>("all");
  const [genreFilter, setGenreFilter] = useState<number | null>(null);
  const [minYear, setMinYear] = useState<number | null>(null);
  const [maxYear, setMaxYear] = useState<number | null>(null);
  const [streamingServiceFilter, setStreamingServiceFilter] = useState<
    number | null
  >(null);
  const [providerAvailability, setProviderAvailability] = useState<
    Record<number, number[]>
  >({});
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<
    ReturnType<typeof setTimeout> | null
  >(null);
  const [contentStatuses, setContentStatuses] = useState<
    Record<number, "watched" | "to_watch" | "favourite" | null>
  >({});
  const { showToast, ToastContainer } = useToast();

  // Debounced search function
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    // If query is empty, clear results
    if (query.trim().length === 0) {
      setResults([]);
      setLoading(false);
      setError(null);
      setProviderAvailability({}); // Clear provider availability on new search
      return;
    }

    // Set loading state
    setLoading(true);
    setError(null);

    // Set new timer for debounced search
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&page=1`,
        );

        if (!response.ok) {
          throw new Error("Failed to search");
        }

        const data: SearchResponse = await response.json();
        setResults(data.results);
        setError(null);
        // Clear provider availability when new search results arrive
        setProviderAvailability({});
        // Clear content statuses for new search
        setContentStatuses({});
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setResults([]);
        setProviderAvailability({});
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce delay

    setDebounceTimer(timer);

    // Cleanup function
    return () => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
    };
  }, [query]);

  // Extract unique genres from results
  const availableGenres = new Map<number, string>();
  results.forEach((content) => {
    const genreIds = (content.metadata.genre_ids as number[]) || [];
    genreIds.forEach((genreId) => {
      if (GENRE_MAP[genreId] && !availableGenres.has(genreId)) {
        availableGenres.set(genreId, GENRE_MAP[genreId]);
      }
    });
  });

  // Sort genres by name
  const sortedGenres = Array.from(availableGenres.entries())
    .sort((a, b) => a[1].localeCompare(b[1]));

  // Extract available years from results
  const availableYears = new Set<number>();
  results.forEach((content) => {
    if (content.release_date) {
      const year = new Date(content.release_date).getFullYear();
      if (!isNaN(year)) {
        availableYears.add(year);
      }
    }
  });
  const sortedYears = Array.from(availableYears).sort((a, b) => a - b);
  const minAvailableYear = sortedYears.length > 0 ? sortedYears[0] : null;
  const maxAvailableYear = sortedYears.length > 0
    ? sortedYears[sortedYears.length - 1]
    : null;

  // Helper function to fetch provider availability
  const fetchProviderAvailability = async (
    contentList: Content[],
  ): Promise<Record<number, number[]>> => {
    const response = await fetch("/api/search/providers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: contentList.map((c) => ({
          tmdb_id: c.tmdb_id,
          type: c.type,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch provider availability");
    }

    const data = await response.json();
    const availability: Record<number, number[]> = {};

    Object.entries(data.availability).forEach(([tmdbId, info]) => {
      const availabilityInfo = info as {
        provider_ids: number[];
        providers: unknown[];
      };
      availability[parseInt(tmdbId, 10)] = availabilityInfo.provider_ids;
    });

    return availability;
  };

  // Fetch provider availability when streaming service filter is selected
  useEffect(() => {
    if (
      streamingServiceFilter !== null && results.length > 0 && !loadingProviders
    ) {
      // Check if we already have provider data for all results
      const resultIds = results.map((c) => c.tmdb_id);
      const needsFetch = resultIds.some(
        (tmdbId) => !providerAvailability[tmdbId],
      );

      if (needsFetch) {
        setLoadingProviders(true);
        fetchProviderAvailability(results)
          .then((availability) => {
            setProviderAvailability(availability);
          })
          .catch((error) => {
            console.error("Failed to fetch provider availability:", error);
          })
          .finally(() => {
            setLoadingProviders(false);
          });
      }
    }
  }, [streamingServiceFilter, results.length]);

  // Filter results by content type, genre, year range, and streaming service
  const filteredResults = results.filter((content) => {
    // Apply type filter
    if (typeFilter !== "all" && content.type !== typeFilter) {
      return false;
    }

    // Apply genre filter
    if (genreFilter !== null) {
      const genreIds = (content.metadata.genre_ids as number[]) || [];
      if (!genreIds.includes(genreFilter)) {
        return false;
      }
    }

    // Apply year range filter
    if (content.release_date) {
      const year = new Date(content.release_date).getFullYear();
      if (!isNaN(year)) {
        if (minYear !== null && year < minYear) {
          return false;
        }
        if (maxYear !== null && year > maxYear) {
          return false;
        }
      } else {
        // If date is invalid and year filter is set, exclude
        if (minYear !== null || maxYear !== null) {
          return false;
        }
      }
    } else {
      // If no release date and year filter is set, exclude
      if (minYear !== null || maxYear !== null) {
        return false;
      }
    }

    // Apply streaming service filter
    if (streamingServiceFilter !== null) {
      const providerIds = providerAvailability[content.tmdb_id] || [];
      if (!providerIds.includes(streamingServiceFilter)) {
        return false;
      }
    }

    return true;
  });

  // Helper function to get poster image URL
  const getPosterUrl = (posterPath: string | null): string => {
    if (!posterPath) {
      return "https://via.placeholder.com/300x450?text=No+Poster";
    }
    return `https://image.tmdb.org/t/p/w300${posterPath}`;
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

  return (
    <div>
      <ToastContainer />
      {/* Search Input */}
      <div class="mb-8">
        <label for="search-input" class="sr-only">
          Search for movies and TV shows
        </label>
        <input
          type="text"
          id="search-input"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search for movies and TV shows..."
          aria-label="Search for movies and TV shows"
          aria-describedby="search-description"
          class="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-600 dark:placeholder-gray-400"
          autofocus
        />
        <p id="search-description" class="sr-only">
          Enter a search term to find movies and TV shows. Results will appear
          as you type.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          class="text-center py-8"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p class="text-gray-600">Searching...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div class="text-center py-8" role="alert" aria-live="assertive">
          <p class="text-red-600">Error: {error}</p>
        </div>
      )}

      {/* Filter Buttons */}
      {!loading && !error && results.length > 0 && (
        <div class="mb-6 space-y-4">
          {/* Content Type Filters */}
          <div class="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              aria-pressed={typeFilter === "all"}
              aria-label="Show all content types"
              class={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("movie")}
              aria-pressed={typeFilter === "movie"}
              aria-label="Show only movies"
              class={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === "movie"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Movies
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("tv")}
              aria-pressed={typeFilter === "tv"}
              aria-label="Show only TV shows"
              class={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === "tv"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              TV Shows
            </button>
          </div>

          {/* Genre Filter Dropdown */}
          {sortedGenres.length > 0 && (
            <div class="flex items-center gap-2">
              <label
                for="genre-filter"
                class="text-sm font-medium text-gray-700"
              >
                Genre:
              </label>
              <select
                id="genre-filter"
                value={genreFilter?.toString() || ""}
                onChange={(e) => {
                  const value = (e.target as HTMLSelectElement).value;
                  setGenreFilter(value === "" ? null : parseInt(value, 10));
                }}
                class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">All Genres</option>
                {sortedGenres.map(([genreId, genreName]) => (
                  <option key={genreId} value={genreId.toString()}>
                    {genreName}
                  </option>
                ))}
              </select>
              {genreFilter !== null && (
                <button
                  type="button"
                  onClick={() => setGenreFilter(null)}
                  aria-label="Clear genre filter"
                  class="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Year Range Filter */}
          {minAvailableYear !== null && maxAvailableYear !== null && (
            <div class="flex items-center gap-2 flex-wrap">
              <label
                for="min-year"
                class="text-sm font-medium text-gray-700"
              >
                Year Range:
              </label>
              <input
                type="number"
                id="min-year"
                min={minAvailableYear}
                max={maxYear !== null ? maxYear : maxAvailableYear}
                value={minYear?.toString() || ""}
                onChange={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  const year = value === "" ? null : parseInt(value, 10);
                  if (year !== null && maxYear !== null && year > maxYear) {
                    // If min year exceeds max year, update max year
                    setMaxYear(year);
                  }
                  setMinYear(year);
                }}
                placeholder={minAvailableYear.toString()}
                class="px-3 py-2 w-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              />
              <span class="text-gray-600">to</span>
              <input
                type="number"
                id="max-year"
                min={minYear !== null ? minYear : minAvailableYear}
                max={maxAvailableYear}
                value={maxYear?.toString() || ""}
                onChange={(e) => {
                  const value = (e.target as HTMLInputElement).value;
                  const year = value === "" ? null : parseInt(value, 10);
                  if (year !== null && minYear !== null && year < minYear) {
                    // If max year is less than min year, update min year
                    setMinYear(year);
                  }
                  setMaxYear(year);
                }}
                placeholder={maxAvailableYear.toString()}
                class="px-3 py-2 w-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              />
              {(minYear !== null || maxYear !== null) && (
                <button
                  type="button"
                  onClick={() => {
                    setMinYear(null);
                    setMaxYear(null);
                  }}
                  aria-label="Clear year range filter"
                  class="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Streaming Service Filter */}
          {results.length > 0 && (
            <div class="flex items-center gap-2">
              <label
                for="streaming-service-filter"
                class="text-sm font-medium text-gray-700"
              >
                Streaming Service:
              </label>
              <select
                id="streaming-service-filter"
                value={streamingServiceFilter?.toString() || ""}
                onChange={(e) => {
                  const value = (e.target as HTMLSelectElement).value;
                  setStreamingServiceFilter(
                    value === "" ? null : parseInt(value, 10),
                  );
                  // Clear provider availability when filter changes
                  if (value === "") {
                    setProviderAvailability({});
                  }
                }}
                disabled={loadingProviders}
                class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Services</option>
                {STREAMING_SERVICES.map((service) => (
                  <option key={service.id} value={service.id.toString()}>
                    {service.name}
                  </option>
                ))}
              </select>
              {streamingServiceFilter !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setStreamingServiceFilter(null);
                    setProviderAvailability({});
                  }}
                  disabled={loadingProviders}
                  aria-label="Clear streaming service filter"
                  aria-busy={loadingProviders}
                  class="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              )}
              {loadingProviders && (
                <span
                  class="text-sm text-gray-500"
                  role="status"
                  aria-live="polite"
                >
                  Loading availability...
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading State - Skeleton Cards */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading search results"
        >
          <ContentGrid>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </ContentGrid>
        </div>
      )}

      {/* Results */}
      {!loading && !error && filteredResults.length > 0 && (
        <div role="region" aria-live="polite" aria-label="Search results">
          <p class="text-gray-600 mb-4" role="status">
            Found {filteredResults.length}{" "}
            result{filteredResults.length !== 1 ? "s" : ""}
            {(typeFilter !== "all" || genreFilter !== null ||
              minYear !== null || maxYear !== null ||
              streamingServiceFilter !== null) &&
              ` (${results.length} total)`}
          </p>
          <ContentGrid>
            {filteredResults.map((content) => (
              <a
                href={`/content/${content.tmdb_id}`}
                class="block group relative hover:scale-105 transition-transform"
                key={`${content.type}-${content.tmdb_id}`}
                onMouseEnter={() => fetchContentStatus(content.tmdb_id)}
              >
                <div class="bg-white rounded-lg shadow-md overflow-hidden relative">
                  <img
                    src={getPosterUrl(content.poster_path)}
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
        </div>
      )}

      {/* No Results */}
      {!loading && !error && query.trim().length > 0 &&
        filteredResults.length === 0 &&
        (
          <div class="text-center py-8">
            <p class="text-gray-600">
              {results.length === 0
                ? `No results found for "${query}"`
                : `No ${
                  typeFilter === "movie"
                    ? "movies"
                    : typeFilter === "tv"
                    ? "TV shows"
                    : "content"
                }${
                  genreFilter !== null ? ` in ${GENRE_MAP[genreFilter]}` : ""
                }${
                  minYear !== null || maxYear !== null
                    ? ` from ${
                      minYear !== null ? minYear : minAvailableYear
                    } to ${maxYear !== null ? maxYear : maxAvailableYear}`
                    : ""
                }${
                  streamingServiceFilter !== null
                    ? ` on ${
                      STREAMING_SERVICES.find(
                        (s) => s.id === streamingServiceFilter,
                      )?.name || "selected service"
                    }`
                    : ""
                } found for "${query}"`}
            </p>
            {results.length > 0 &&
              (typeFilter !== "all" || genreFilter !== null ||
                minYear !== null || maxYear !== null ||
                streamingServiceFilter !== null) &&
              (
                <div class="mt-4 flex gap-2 justify-center flex-wrap">
                  {typeFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setTypeFilter("all")}
                      class="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Show all types
                    </button>
                  )}
                  {genreFilter !== null && (
                    <button
                      type="button"
                      onClick={() => setGenreFilter(null)}
                      class="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Show all genres
                    </button>
                  )}
                  {(minYear !== null || maxYear !== null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setMinYear(null);
                        setMaxYear(null);
                      }}
                      class="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Show all years
                    </button>
                  )}
                  {streamingServiceFilter !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setStreamingServiceFilter(null);
                        setProviderAvailability({});
                      }}
                      class="text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Show all services
                    </button>
                  )}
                </div>
              )}
          </div>
        )}

      {/* Empty State */}
      {!loading && !error && query.trim().length === 0 && (
        <div class="text-center py-8">
          <p class="text-gray-600">
            Start typing to search for movies and TV shows
          </p>
        </div>
      )}
    </div>
  );
}
