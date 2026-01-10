import { useEffect, useState } from "preact/hooks";
import type { Content } from "../lib/tmdb/client.ts";

interface TrendingResponse {
  results: Content[];
  total_results: number;
  page: number;
  total_pages: number;
}

/**
 * New Releases section component
 * Displays fresh content from trending API
 */
export default function NewReleases() {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch trending content on mount
  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/trending?time_window=day&page=1");

        if (!response.ok) {
          throw new Error("Failed to fetch new releases");
        }

        const data: TrendingResponse = await response.json();
        // Limit to first 6 items for home feed
        setContent((data.results || []).slice(0, 6));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching new releases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNewReleases();
  }, []);

  // Helper function to get poster image URL
  const getPosterUrl = (posterPath: string | null): string => {
    if (!posterPath) {
      return "https://via.placeholder.com/300x450?text=No+Poster";
    }
    return `https://image.tmdb.org/t/p/w300${posterPath}`;
  };

  return (
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">New Releases</h2>
          <p class="text-sm text-gray-600 mt-1">
            Fresh content trending now
          </p>
        </div>
        <a
          href="/browse"
          class="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View All →
        </a>
      </div>

      {/* Loading State */}
      {loading && (
        <div class="text-center py-8">
          <p class="text-gray-600">Loading...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div class="text-center py-8">
          <p class="text-red-600">Error: {error}</p>
        </div>
      )}

      {/* Content Grid */}
      {!loading && !error && content.length > 0 && (
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {content.map((item) => (
            <a
              href={`/content/${item.tmdb_id}`}
              class="block group"
              key={`${item.type}-${item.tmdb_id}`}
            >
              <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div class="relative">
                  <img
                    src={getPosterUrl(item.poster_path)}
                    alt={item.title}
                    class="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                  />
                  <div class="absolute top-2 right-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white uppercase">
                      {item.type}
                    </span>
                  </div>
                </div>
                <div class="p-3">
                  <h3 class="font-semibold text-sm text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  {item.release_date && (
                    <p class="text-xs text-gray-500">
                      {new Date(item.release_date).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
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
