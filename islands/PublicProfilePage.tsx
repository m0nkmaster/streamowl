import ContentGrid from "../components/ContentGrid.tsx";

interface PublicProfilePageProps {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  stats: {
    watchedCount: number;
    favouritesCount: number;
    watchlistCount: number;
    averageRating: number | null;
  };
  favourites: Array<{
    tmdb_id: number;
    type: "movie" | "tv" | "documentary";
    title: string;
    poster_path: string | null;
    release_date: string | null;
  }>;
}

/**
 * Helper function to get poster image URL
 */
function getPosterUrl(posterPath: string | null): string {
  if (!posterPath) {
    return "https://via.placeholder.com/300x450?text=No+Poster";
  }
  return `https://image.tmdb.org/t/p/w500${posterPath}`;
}

export default function PublicProfilePage({
  displayName,
  avatarUrl,
  stats,
  favourites,
}: PublicProfilePageProps) {
  const displayNameText = displayName || "Anonymous User";

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div class="bg-white shadow rounded-lg mb-8">
          <div class="px-6 py-8">
            <div class="flex items-center space-x-6">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayNameText}
                  class="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div class="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span class="text-3xl font-bold text-indigo-600">
                    {displayNameText.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 class="text-3xl font-bold text-gray-900">
                  {displayNameText}
                </h1>
                <p class="text-sm text-gray-500 mt-1">Public Profile</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white shadow rounded-lg p-6">
            <div class="text-3xl font-bold text-gray-900">
              {stats.watchedCount}
            </div>
            <div class="text-sm text-gray-500 mt-1">Watched</div>
          </div>
          <div class="bg-white shadow rounded-lg p-6">
            <div class="text-3xl font-bold text-gray-900">
              {stats.favouritesCount}
            </div>
            <div class="text-sm text-gray-500 mt-1">Favourites</div>
          </div>
          <div class="bg-white shadow rounded-lg p-6">
            <div class="text-3xl font-bold text-gray-900">
              {stats.watchlistCount}
            </div>
            <div class="text-sm text-gray-500 mt-1">Watchlist</div>
          </div>
          <div class="bg-white shadow rounded-lg p-6">
            <div class="text-3xl font-bold text-gray-900">
              {stats.averageRating !== null
                ? stats.averageRating.toFixed(1)
                : "—"}
            </div>
            <div class="text-sm text-gray-500 mt-1">Avg Rating</div>
          </div>
        </div>

        {/* Favourites Section */}
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">
            Favourites
            {favourites.length > 0 && (
              <span class="text-lg font-normal text-gray-500 ml-2">
                ({favourites.length})
              </span>
            )}
          </h2>

          {favourites.length === 0 ? (
            <div class="text-center py-12">
              <p class="text-gray-500">No favourites yet</p>
            </div>
          ) : (
            <ContentGrid>
              {favourites.map((item) => (
                <a
                  key={item.tmdb_id}
                  href={`/content/${item.tmdb_id}`}
                  class="group"
                >
                  <div class="bg-white rounded-lg shadow-md overflow-hidden relative">
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
                      <div class="flex items-center justify-between mt-2">
                        <span class="text-xs text-gray-500 uppercase">
                          {item.type}
                        </span>
                        {item.release_date && (
                          <span class="text-xs text-gray-500">
                            {new Date(item.release_date).getFullYear()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </ContentGrid>
          )}
        </div>
      </div>
    </div>
  );
}
