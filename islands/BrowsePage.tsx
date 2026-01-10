import { useEffect, useState } from "preact/hooks";
import type { Content } from "../lib/tmdb/client.ts";

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

  // Helper function to get poster image URL
  const getPosterUrl = (posterPath: string | null): string => {
    if (!posterPath) {
      return "https://via.placeholder.com/300x450?text=No+Poster";
    }
    return `https://image.tmdb.org/t/p/w300${posterPath}`;
  };

  return (
    <div>
      {/* Trending Section */}
      <section class="mb-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Trending</h2>

        {/* Loading State */}
        {loading && (
          <div class="text-center py-8">
            <p class="text-gray-600">Loading trending content...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div class="text-center py-8">
            <p class="text-red-600">Error: {error}</p>
          </div>
        )}

        {/* Trending Content Grid */}
        {!loading && !error && trending.length > 0 && (
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trending.map((content) => (
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
          </div>
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
