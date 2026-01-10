import { type Handlers, type PageProps } from "$fresh/server.ts";
import {
  getMovieDetails,
  getTvDetails,
  type MovieDetails,
  type TvDetails,
} from "../../lib/tmdb/client.ts";

interface ContentDetailPageProps {
  content: MovieDetails | TvDetails;
  contentType: "movie" | "tv";
}

/**
 * Content detail page route handler
 * Fetches content details from TMDB API and renders detail page
 */
export const handler: Handlers<ContentDetailPageProps> = {
  async GET(_req, ctx) {
    const { tmdb_id } = ctx.params;
    const contentId = parseInt(tmdb_id, 10);

    // Validate content ID
    if (!Number.isInteger(contentId) || contentId <= 0) {
      return new Response("Invalid content ID", { status: 400 });
    }

    // Try fetching as movie first, then as TV show
    let content: MovieDetails | TvDetails;
    let contentType: "movie" | "tv";

    try {
      content = await getMovieDetails(contentId);
      contentType = "movie";
    } catch (movieError) {
      // If movie fetch fails, try as TV show
      try {
        content = await getTvDetails(contentId);
        contentType = "tv";
      } catch (tvError) {
        // Both failed, return 404
        return new Response("Content not found", { status: 404 });
      }
    }

    return ctx.render({ content, contentType });
  },
};

/**
 * Helper function to get poster image URL
 */
function getPosterUrl(posterPath: string | null): string {
  if (!posterPath) {
    return "https://via.placeholder.com/300x450?text=No+Poster";
  }
  return `https://image.tmdb.org/t/p/w500${posterPath}`;
}

/**
 * Helper function to get backdrop image URL
 */
function getBackdropUrl(backdropPath: string | null): string {
  if (!backdropPath) {
    return "";
  }
  return `https://image.tmdb.org/t/p/w1280${backdropPath}`;
}

/**
 * Helper function to get profile image URL
 */
function getProfileUrl(profilePath: string | null): string {
  if (!profilePath) {
    return "https://via.placeholder.com/185x278?text=No+Photo";
  }
  return `https://image.tmdb.org/t/p/w185${profilePath}`;
}

/**
 * Helper function to format runtime
 */
function formatRuntime(runtime: number | null | number[]): string {
  if (runtime === null) {
    return "N/A";
  }
  if (Array.isArray(runtime)) {
    // TV shows have episode_run_time array, use average or first
    const avgRuntime = runtime.length > 0
      ? Math.round(
        runtime.reduce((sum, r) => sum + r, 0) / runtime.length,
      )
      : null;
    if (avgRuntime === null) {
      return "N/A";
    }
    return `${avgRuntime} min`;
  }
  return `${runtime} min`;
}

/**
 * Helper function to format release date
 */
function formatReleaseDate(dateString: string | null): string {
  if (!dateString) {
    return "N/A";
  }
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
}

/**
 * Helper function to format rating
 */
function formatRating(voteAverage: number): string {
  return voteAverage.toFixed(1);
}

export default function ContentDetailPage(
  { data }: PageProps<ContentDetailPageProps>,
) {
  const { content, contentType } = data;
  const isMovie = contentType === "movie";
  const title = isMovie
    ? (content as MovieDetails).title
    : (content as TvDetails).name;
  const releaseDate = isMovie
    ? (content as MovieDetails).release_date
    : (content as TvDetails).first_air_date;
  const runtime = isMovie
    ? (content as MovieDetails).runtime
    : (content as TvDetails).episode_run_time;
  const cast = content.credits?.cast || [];
  const backdropUrl = getBackdropUrl(content.backdrop_path);

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Backdrop Image */}
      {backdropUrl && (
        <div
          class="relative h-96 bg-cover bg-center"
          style={`background-image: url(${backdropUrl})`}
        >
          <div class="absolute inset-0 bg-black bg-opacity-50" />
        </div>
      )}

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div class="flex-shrink-0">
            <img
              src={getPosterUrl(content.poster_path)}
              alt={title}
              class="w-64 md:w-80 rounded-lg shadow-lg"
            />
          </div>

          {/* Content Details */}
          <div class="flex-1">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">{title}</h1>

            {/* Metadata Row */}
            <div class="flex flex-wrap gap-4 mb-6 text-gray-600">
              <div>
                <span class="font-semibold">Release Date:</span>{" "}
                {formatReleaseDate(releaseDate)}
              </div>
              <div>
                <span class="font-semibold">Runtime:</span>{" "}
                {formatRuntime(runtime)}
              </div>
              <div>
                <span class="font-semibold">Rating:</span>{" "}
                {formatRating(content.vote_average)}/10 (
                {content.vote_count.toLocaleString()} votes)
              </div>
              <div>
                <span class="font-semibold">Type:</span>{" "}
                <span class="uppercase">{contentType}</span>
              </div>
            </div>

            {/* Genres */}
            {content.genres && content.genres.length > 0 && (
              <div class="mb-6">
                <div class="flex flex-wrap gap-2">
                  {content.genres.map((genre) => (
                    <span
                      key={genre.id}
                      class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Synopsis */}
            {content.overview && (
              <div class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-900 mb-3">
                  Synopsis
                </h2>
                <p class="text-gray-700 leading-relaxed">{content.overview}</p>
              </div>
            )}

            {/* Cast */}
            {cast.length > 0 && (
              <div>
                <h2 class="text-2xl font-semibold text-gray-900 mb-4">
                  Cast
                </h2>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {cast.slice(0, 12).map((member) => (
                    <div
                      key={member.id}
                      class="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                      <img
                        src={getProfileUrl(member.profile_path)}
                        alt={member.name}
                        class="w-full aspect-[2/3] object-cover"
                        loading="lazy"
                      />
                      <div class="p-3">
                        <p class="font-semibold text-sm text-gray-900 line-clamp-2">
                          {member.name}
                        </p>
                        {member.character && (
                          <p class="text-xs text-gray-600 mt-1 line-clamp-2">
                            {member.character}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
