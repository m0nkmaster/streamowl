import { useEffect, useState } from "preact/hooks";
import type { Content } from "../lib/tmdb/client.ts";
import ContentGrid from "../components/ContentGrid.tsx";

interface SearchResponse {
  results: Content[];
  total_results: number;
  page: number;
  total_pages: number;
}

/**
 * Search page island component
 * Handles search input with debouncing and displays results
 */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<
    ReturnType<typeof setTimeout> | null
  >(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setResults([]);
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

  // Helper function to get poster image URL
  const getPosterUrl = (posterPath: string | null): string => {
    if (!posterPath) {
      return "https://via.placeholder.com/300x450?text=No+Poster";
    }
    return `https://image.tmdb.org/t/p/w300${posterPath}`;
  };

  return (
    <div>
      {/* Search Input */}
      <div class="mb-8">
        <input
          type="text"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search for movies and TV shows..."
          class="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          autofocus
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div class="text-center py-8">
          <p class="text-gray-600">Searching...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div class="text-center py-8">
          <p class="text-red-600">Error: {error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && !error && results.length > 0 && (
        <div>
          <p class="text-gray-600 mb-4">
            Found {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          <ContentGrid>
            {results.map((content) => (
              <a
                href={`/content/${content.tmdb_id}`}
                class="block group hover:scale-105 transition-transform"
                key={`${content.type}-${content.tmdb_id}`}
              >
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                  <img
                    src={getPosterUrl(content.poster_path)}
                    alt={content.title}
                    class="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                  />
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
      {!loading && !error && query.trim().length > 0 && results.length === 0 &&
        (
          <div class="text-center py-8">
            <p class="text-gray-600">No results found for "{query}"</p>
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
