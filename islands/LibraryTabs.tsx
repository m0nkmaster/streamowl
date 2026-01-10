import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import CreateListModal from "./CreateListModal.tsx";

interface WatchedContent {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  watched_at: string;
  rating: number | null;
}

interface WatchlistContent {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  added_at: string;
  rating: number | null;
}

interface FavouritesContent {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  added_at: string;
  rating: number | null;
}

interface CustomList {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  item_count: number;
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
  const [favouritesContent, setFavouritesContent] = useState<
    FavouritesContent[]
  >([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch custom lists on mount
  useEffect(() => {
    if (!IS_BROWSER) {
      return;
    }

    const fetchLists = async () => {
      try {
        const response = await fetch("/api/library/lists");

        if (!response.ok) {
          throw new Error("Failed to fetch lists");
        }

        const data = await response.json();
        setCustomLists(data.lists || []);
      } catch (err) {
        console.error("Error fetching lists:", err);
        // Don't show error for lists, just log it
      }
    };

    fetchLists();
  }, []);

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
    } else if (activeTab === "favourites") {
      // Fetch favourites content
      const fetchFavouritesContent = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await fetch("/api/library/favourites");

          if (!response.ok) {
            throw new Error("Failed to fetch favourites content");
          }

          const data = await response.json();
          setFavouritesContent(data.content || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : "An error occurred");
          console.error("Error fetching favourites content:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchFavouritesContent();
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

  const handleListCreated = () => {
    // Refresh lists after creation
    const fetchLists = async () => {
      try {
        const response = await fetch("/api/library/lists");

        if (!response.ok) {
          throw new Error("Failed to fetch lists");
        }

        const data = await response.json();
        setCustomLists(data.lists || []);
      } catch (err) {
        console.error("Error fetching lists:", err);
      }
    };

    fetchLists();
  };

  return (
    <>
      <div class="flex flex-col lg:flex-row gap-8">
        {/* Sidebar with Custom Lists */}
        <aside class="lg:w-64 flex-shrink-0">
          <div class="bg-white rounded-lg shadow-sm p-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">My Lists</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg
                  class="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create List
              </button>
            </div>

            {customLists.length === 0
              ? (
                <p class="text-sm text-gray-500 text-center py-4">
                  No custom lists yet. Create your first list!
                </p>
              )
              : (
                <ul class="space-y-2">
                  {customLists.map((list) => (
                    <li key={list.id}>
                      <a
                        href={`/lists/${list.id}`}
                        class="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      >
                        <div class="font-medium">{list.name}</div>
                        <div class="text-xs text-gray-500 mt-1">
                          {list.item_count}{" "}
                          item{list.item_count !== 1 ? "s" : ""}
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </aside>

        {/* Main Content */}
        <div class="flex-1">
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
                          <div class="mt-2 space-y-1">
                            <p class="text-xs text-gray-500">
                              Watched: {formatDate(item.watched_at)}
                            </p>
                            {item.rating !== null && (
                              <p class="text-xs font-medium text-indigo-600">
                                ⭐ {item.rating.toFixed(1)}/10
                              </p>
                            )}
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
                          <div class="mt-2 space-y-1">
                            <p class="text-xs text-gray-500">
                              Added: {formatDate(item.added_at)}
                            </p>
                            {item.rating !== null && (
                              <p class="text-xs font-medium text-indigo-600">
                                ⭐ {item.rating.toFixed(1)}/10
                              </p>
                            )}
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

              {!loading && !error && favouritesContent.length === 0 && (
                <div class="text-center py-8">
                  <p class="text-gray-600">No favourites yet.</p>
                  <p class="text-gray-500 text-sm mt-2">
                    Mark content as favourite to see it here.
                  </p>
                </div>
              )}

              {!loading && !error && favouritesContent.length > 0 && (
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favouritesContent.map((item) => (
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
                          <div class="mt-2 space-y-1">
                            <p class="text-xs text-gray-500">
                              Added: {formatDate(item.added_at)}
                            </p>
                            {item.rating !== null && (
                              <p class="text-xs font-medium text-indigo-600">
                                ⭐ {item.rating.toFixed(1)}/10
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create List Modal */}
      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onListCreated={handleListCreated}
      />
    </>
  );
}
