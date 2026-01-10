import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface WatchedContent {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  watched_at: string;
}

interface WatchlistContent {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  added_at: string;
}

interface LibraryTabsProps {
  initialTab?: "watched" | "to_watch" | "favourites";
}

/**
 * Island component for library tabs and content display
 */
export default function LibraryTabs(
  { initialTab = "watched" }: LibraryTabsProps,
) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [watchedContent, setWatchedContent] = useState<WatchedContent[]>([]);
  const [watchlistContent, setWatchlistContent] = useState<
    WatchlistContent[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!IS_BROWSER) {
      setLoading(false);
      return;
    }

    if (activeTab === "watched") {
      // Fetch watched content
      const fetchWatchedContent = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await fetch("/api/library/watched");

          if (!response.ok) {
            throw new Error("Failed to fetch watched content");
          }

          const data = await response.json();
          setWatchedContent(data.content || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : "An error occurred");
          console.error("Error fetching watched content:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchWatchedContent();
    } else if (activeTab === "to_watch") {
      // Fetch watchlist content
      const fetchWatchlistContent = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await fetch("/api/library/watchlist");

          if (!response.ok) {
            throw new Error("Failed to fetch watchlist content");
          }

          const data = await response.json();
          setWatchlistContent(data.content || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : "An error occurred");
          console.error("Error fetching watchlist content:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchWatchlistContent();
    } else {
      setLoading(false);
    }
  }, [activeTab]);

  const getPosterUrl = (posterPath: string | null): string => {
    if (!posterPath) {
      return "https://via.placeholder.com/300x450?text=No+Poster";
    }
    return `https://image.tmdb.org/t/p/w300${posterPath}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab("watched")}
            class={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "watched"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Watched
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("to_watch")}
            class={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "to_watch"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            To Watch
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("favourites")}
            class={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "favourites"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Favourites
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === "watched" && (
        <div>
          {loading && (
            <div class="text-center py-8">
              <p class="text-gray-600">Loading...</p>
            </div>
          )}

          {error && (
            <div class="text-center py-8">
              <p class="text-red-600">Error: {error}</p>
            </div>
          )}

          {!loading && !error && watchedContent.length === 0 && (
            <div class="text-center py-8">
              <p class="text-gray-600">No watched content yet.</p>
              <p class="text-gray-500 text-sm mt-2">
                Mark content as watched to see it here.
              </p>
            </div>
          )}

          {!loading && !error && watchedContent.length > 0 && (
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {watchedContent.map((item) => (
                <a
                  href={`/content/${item.tmdb_id}`}
                  key={`${item.type}-${item.tmdb_id}`}
                  class="block group hover:scale-105 transition-transform"
                >
                  <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <img
                      src={getPosterUrl(item.poster_path)}
                      alt={item.title}
                      class="w-full aspect-[2/3] object-cover"
                      loading="lazy"
                    />
                    <div class="p-3">
                      <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-indigo-600">
                        {item.title}
                      </h3>
                      <div class="mt-2">
                        <p class="text-xs text-gray-500">
                          Watched: {formatDate(item.watched_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "to_watch" && (
        <div>
          {loading && (
            <div class="text-center py-8">
              <p class="text-gray-600">Loading...</p>
            </div>
          )}

          {error && (
            <div class="text-center py-8">
              <p class="text-red-600">Error: {error}</p>
            </div>
          )}

          {!loading && !error && watchlistContent.length === 0 && (
            <div class="text-center py-8">
              <p class="text-gray-600">Your watchlist is empty.</p>
              <p class="text-gray-500 text-sm mt-2">
                Add content to your watchlist to see it here.
              </p>
            </div>
          )}

          {!loading && !error && watchlistContent.length > 0 && (
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {watchlistContent.map((item) => (
                <a
                  href={`/content/${item.tmdb_id}`}
                  key={`${item.type}-${item.tmdb_id}`}
                  class="block group hover:scale-105 transition-transform"
                >
                  <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <img
                      src={getPosterUrl(item.poster_path)}
                      alt={item.title}
                      class="w-full aspect-[2/3] object-cover"
                      loading="lazy"
                    />
                    <div class="p-3">
                      <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-indigo-600">
                        {item.title}
                      </h3>
                      <div class="mt-2">
                        <p class="text-xs text-gray-500">
                          Added: {formatDate(item.added_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "favourites" && (
        <div class="text-center py-8">
          <p class="text-gray-600">Favourites list coming soon.</p>
        </div>
      )}
    </div>
  );
}
