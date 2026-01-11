import { useEffect, useState } from "preact/hooks";
import {
  getGridPosterSize,
  getPosterSrcSet,
  getPosterUrl,
} from "../lib/images.ts";
import SkeletonCard from "../components/SkeletonCard.tsx";

interface WatchedContent {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  watched_at: string;
  rating: number | null;
}

interface WatchedResponse {
  content: WatchedContent[];
}

/**
 * Continue Watching section component
 * Displays recently watched content for quick access
 */
export default function ContinueWatching() {
  const [content, setContent] = useState<WatchedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recently watched content on mount
  useEffect(() => {
    const fetchWatched = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/library/watched");

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Please log in to see your watched content");
          }
          throw new Error("Failed to fetch watched content");
        }

        const data: WatchedResponse = await response.json();
        // Limit to most recent 6 items for home feed
        setContent((data.content || []).slice(0, 6));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching watched content:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWatched();
  }, []);

  // Don't render if no content
  if (!loading && !error && content.length === 0) {
    return null;
  }

  return (
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Continue Watching</h2>
          <p class="text-sm text-gray-600 mt-1">
            Pick up where you left off
          </p>
        </div>
      </div>

      {/* Loading State - Skeleton Cards */}
      {loading && (
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
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
                    src={getPosterUrl(item.poster_path, getGridPosterSize())}
                    srcSet={getPosterSrcSet(item.poster_path)}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    alt={item.title}
                    class="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                    width="300"
                    height="450"
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
    </section>
  );
}
