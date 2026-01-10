import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../lib/auth/middleware.ts";
import {
  type CategorisedWatchProviders,
  extractTrailerKey,
  getMovieDetails,
  getMovieSimilar,
  getMovieVideos,
  getMovieWatchProvidersByRegion,
  getTvDetails,
  getTvSimilar,
  getTvVideos,
  getTvWatchProvidersByRegion,
  type MovieDetails,
  type SearchResults,
  type SupportedRegion,
  type TvDetails,
} from "../../lib/tmdb/client.ts";
import { getRegionName, getUserRegion } from "../../lib/region.ts";
import {
  getBackdropSrcSet,
  getBackdropUrl,
  getDetailPosterSize,
  getPosterSrcSet,
  getPosterUrl,
} from "../../lib/images.ts";
import MarkAsWatchedButton from "../../islands/MarkAsWatchedButton.tsx";
import AddToWatchlistButton from "../../islands/AddToWatchlistButton.tsx";
import FavouriteButton from "../../islands/FavouriteButton.tsx";
import AddToListButton from "../../islands/AddToListButton.tsx";
import RatingComponent from "../../islands/RatingComponent.tsx";
import NotesComponent from "../../islands/NotesComponent.tsx";
import TagsComponent from "../../islands/TagsComponent.tsx";
import ContentGrid from "../../components/ContentGrid.tsx";

interface Tag {
  id: string;
  name: string;
  colour: string;
}

interface ContentDetailPageProps {
  content: MovieDetails | TvDetails;
  contentType: "movie" | "tv";
  watchProviders: CategorisedWatchProviders | null;
  trailerKey: string | null;
  similarTitles: SearchResults | null;
  userStatus: "watched" | "to_watch" | "favourite" | null;
  userRating: number | null;
  userNotes: string | null;
  userTags: Tag[];
  isAuthenticated: boolean;
  region: SupportedRegion;
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

    // Get user region (checks preference first, then detects from headers)
    const session = await getSessionFromRequest(_req);
    const region = await getUserRegion(_req, session);

    // Try fetching as movie first, then as TV show
    let content: MovieDetails | TvDetails;
    let contentType: "movie" | "tv";

    try {
      content = await getMovieDetails(contentId);
      contentType = "movie";
    } catch (_movieError) {
      // If movie fetch fails, try as TV show
      try {
        content = await getTvDetails(contentId);
        contentType = "tv";
      } catch (_tvError) {
        // Both failed, return 404
        return new Response("Content not found", { status: 404 });
      }
    }

    // Fetch watch providers using detected region
    let watchProviders: CategorisedWatchProviders | null = null;
    try {
      if (contentType === "movie") {
        watchProviders = await getMovieWatchProvidersByRegion(
          contentId,
          region,
        );
      } else {
        watchProviders = await getTvWatchProvidersByRegion(contentId, region);
      }
    } catch (error) {
      // Log error but don't fail the page if watch providers fail
      console.error("Failed to fetch watch providers:", error);
    }

    // Fetch videos and extract trailer key
    let trailerKey: string | null = null;
    try {
      if (contentType === "movie") {
        const videos = await getMovieVideos(contentId);
        trailerKey = extractTrailerKey(videos);
      } else {
        const videos = await getTvVideos(contentId);
        trailerKey = extractTrailerKey(videos);
      }
    } catch (error) {
      // Log error but don't fail the page if videos fail
      console.error("Failed to fetch videos:", error);
    }

    // Fetch similar titles
    let similarTitles: SearchResults | null = null;
    try {
      if (contentType === "movie") {
        similarTitles = await getMovieSimilar(contentId, 1);
        // Limit to 12 similar titles
        if (similarTitles.results.length > 12) {
          similarTitles.results = similarTitles.results.slice(0, 12);
        }
      } else {
        similarTitles = await getTvSimilar(contentId, 1);
        // Limit to 12 similar titles
        if (similarTitles.results.length > 12) {
          similarTitles.results = similarTitles.results.slice(0, 12);
        }
      }
    } catch (error) {
      // Log error but don't fail the page if similar titles fail
      console.error("Failed to fetch similar titles:", error);
    }

    // Fetch user status, rating, notes, and tags if authenticated
    let userStatus: "watched" | "to_watch" | "favourite" | null = null;
    let userRating: number | null = null;
    let userNotes: string | null = null;
    let userTags: Tag[] = [];
    if (session) {
      try {
        const { query } = await import("../../lib/db.ts");
        const { getContentByTmdbId } = await import("../../lib/content.ts");

        const contentRecord = await getContentByTmdbId(contentId);
        if (contentRecord) {
          const userContent = await query<{
            status: "watched" | "to_watch" | "favourite";
            rating: number | null;
            notes: string | null;
          }>(
            "SELECT status, rating, notes FROM user_content WHERE user_id = $1 AND content_id = $2",
            [session.userId, contentRecord.id],
          );
          if (userContent.length > 0) {
            userStatus = userContent[0].status;
            userRating = userContent[0].rating;
            userNotes = userContent[0].notes;
          }

          // Fetch tags applied to this content
          const contentTags = await query<{
            tag_id: string;
            tag_name: string;
            tag_colour: string;
          }>(
            `SELECT ct.tag_id, t.name AS tag_name, t.colour AS tag_colour
             FROM content_tags ct
             INNER JOIN tags t ON ct.tag_id = t.id
             WHERE ct.content_id = $1 AND t.user_id = $2
             ORDER BY t.name ASC`,
            [contentRecord.id, session.userId],
          );

          userTags = contentTags.map((ct) => ({
            id: ct.tag_id,
            name: ct.tag_name,
            colour: ct.tag_colour,
          }));
        }
      } catch (error) {
        // Log error but don't fail the page if status fetch fails
        console.error("Failed to fetch user status:", error);
      }
    }

    return ctx.render({
      content,
      contentType,
      watchProviders,
      trailerKey,
      similarTitles,
      userStatus,
      userRating,
      userNotes,
      userTags,
      isAuthenticated: session !== null,
      region,
    });
  },
};

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

/**
 * Helper function to get provider logo URL
 */
function getProviderLogoUrl(logoPath: string | null): string {
  if (!logoPath) {
    return "https://via.placeholder.com/50x50?text=Logo";
  }
  return `https://image.tmdb.org/t/p/w45${logoPath}`;
}

export default function ContentDetailPage(
  { data }: PageProps<ContentDetailPageProps>,
) {
  const {
    content,
    contentType,
    watchProviders,
    trailerKey,
    similarTitles,
    userStatus,
    userRating,
    userNotes,
    userTags,
    isAuthenticated,
    region,
  } = data;
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
  const tmdbId = content.id;

  const backdropSrcSet = getBackdropSrcSet(content.backdrop_path);
  const backdropSrc = getBackdropUrl(content.backdrop_path, "w1280");

  return (
    <div class="min-h-screen bg-gray-50">
      {/* Backdrop Image */}
      {backdropSrc && (
        <div class="relative h-96 overflow-hidden">
          <img
            src={backdropSrc}
            srcSet={backdropSrcSet}
            sizes="100vw"
            alt={`${title} backdrop`}
            class="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div class="absolute inset-0 bg-black bg-opacity-50" />
        </div>
      )}

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div class="flex-shrink-0">
            <img
              src={getPosterUrl(content.poster_path, getDetailPosterSize())}
              srcSet={getPosterSrcSet(content.poster_path)}
              sizes="(max-width: 768px) 256px, 320px"
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

            {/* Action Buttons */}
            {isAuthenticated && (
              <div class="mb-6 space-y-4">
                <div class="flex gap-3 flex-wrap">
                  <MarkAsWatchedButton
                    tmdbId={tmdbId}
                    initialStatus={userStatus}
                  />
                  <AddToWatchlistButton
                    tmdbId={tmdbId}
                    initialStatus={userStatus}
                  />
                  <FavouriteButton
                    tmdbId={tmdbId}
                    initialStatus={userStatus}
                  />
                  <AddToListButton tmdbId={tmdbId} />
                </div>
                {/* Rating Component */}
                <div class="border-t pt-4">
                  <RatingComponent
                    tmdbId={tmdbId}
                    initialRating={userRating}
                  />
                </div>
                {/* Notes Component */}
                <div class="border-t pt-4">
                  <NotesComponent
                    tmdbId={tmdbId}
                    initialNotes={userNotes}
                  />
                </div>
                {/* Tags Component */}
                <div class="border-t pt-4">
                  <TagsComponent
                    tmdbId={tmdbId}
                    initialTags={userTags}
                  />
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

            {/* Trailer */}
            {trailerKey && (
              <div class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-900 mb-4">
                  Trailer
                </h2>
                <div class="relative w-full" style="padding-bottom: 56.25%">
                  <iframe
                    class="absolute top-0 left-0 w-full h-full rounded-lg"
                    src={`https://www.youtube.com/embed/${trailerKey}`}
                    title={`${title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Cast */}
            {cast.length > 0 && (
              <div class="mb-8">
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

            {/* Similar Titles */}
            {similarTitles && similarTitles.results.length > 0 && (
              <div class="mb-8">
                <h2 class="text-2xl font-semibold text-gray-900 mb-4">
                  Similar Titles
                </h2>
                <ContentGrid>
                  {similarTitles.results.map((item) => (
                    <a
                      key={item.tmdb_id}
                      href={`/content/${item.tmdb_id}`}
                      class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      <div class="relative w-full aspect-[2/3] bg-gray-200">
                        <img
                          src={getPosterUrl(item.poster_path, "w300")}
                          srcSet={getPosterSrcSet(item.poster_path)}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          alt={item.title}
                          class="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                      </div>
                      <div class="p-3">
                        <p class="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">
                          {item.title}
                        </p>
                        <div class="flex items-center gap-2 text-xs text-gray-600">
                          <span class="uppercase">{item.type}</span>
                          {item.release_date && (
                            <>
                              <span>•</span>
                              <span>
                                {new Date(item.release_date).getFullYear()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </ContentGrid>
              </div>
            )}

            {/* Where to Watch */}
            {watchProviders && (
              <div class="mb-8">
                <div class="flex items-center gap-3 mb-4">
                  <h2 class="text-2xl font-semibold text-gray-900">
                    Where to Watch
                  </h2>
                  <span
                    class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    title={`Streaming availability for ${
                      getRegionName(region)
                    }`}
                  >
                    {region}
                  </span>
                </div>
                <div class="space-y-6">
                  {/* Subscription Services */}
                  {watchProviders.subscription.length > 0 && (
                    <div>
                      <h3 class="text-lg font-medium text-gray-800 mb-3">
                        Stream
                      </h3>
                      <div class="flex flex-wrap gap-4">
                        {watchProviders.subscription.map((provider) => (
                          <a
                            key={provider.provider_id}
                            href={watchProviders.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center gap-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-3 border border-gray-200 hover:border-indigo-300"
                          >
                            <img
                              src={getProviderLogoUrl(provider.logo_path)}
                              alt={provider.provider_name}
                              class="w-10 h-10 object-contain"
                              loading="lazy"
                            />
                            <span class="text-sm font-medium text-gray-900">
                              {provider.provider_name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rent Options */}
                  {watchProviders.rent.length > 0 && (
                    <div>
                      <h3 class="text-lg font-medium text-gray-800 mb-3">
                        Rent
                      </h3>
                      <div class="flex flex-wrap gap-4">
                        {watchProviders.rent.map((provider) => (
                          <a
                            key={provider.provider_id}
                            href={watchProviders.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center gap-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-3 border border-gray-200 hover:border-indigo-300"
                          >
                            <img
                              src={getProviderLogoUrl(provider.logo_path)}
                              alt={provider.provider_name}
                              class="w-10 h-10 object-contain"
                              loading="lazy"
                            />
                            <span class="text-sm font-medium text-gray-900">
                              {provider.provider_name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Buy Options */}
                  {watchProviders.buy.length > 0 && (
                    <div>
                      <h3 class="text-lg font-medium text-gray-800 mb-3">
                        Buy
                      </h3>
                      <div class="flex flex-wrap gap-4">
                        {watchProviders.buy.map((provider) => (
                          <a
                            key={provider.provider_id}
                            href={watchProviders.link || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex items-center gap-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-3 border border-gray-200 hover:border-indigo-300"
                          >
                            <img
                              src={getProviderLogoUrl(provider.logo_path)}
                              alt={provider.provider_name}
                              class="w-10 h-10 object-contain"
                              loading="lazy"
                            />
                            <span class="text-sm font-medium text-gray-900">
                              {provider.provider_name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Free/Ad-supported Services */}
                  {(watchProviders.free.length > 0 ||
                    watchProviders.ads.length > 0) && (
                    <div>
                      <h3 class="text-lg font-medium text-gray-800 mb-3">
                        Free
                      </h3>
                      <div class="flex flex-wrap gap-4">
                        {[...watchProviders.free, ...watchProviders.ads].map(
                          (provider) => (
                            <a
                              key={provider.provider_id}
                              href={watchProviders.link || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="flex items-center gap-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-3 border border-gray-200 hover:border-indigo-300"
                            >
                              <img
                                src={getProviderLogoUrl(provider.logo_path)}
                                alt={provider.provider_name}
                                class="w-10 h-10 object-contain"
                                loading="lazy"
                              />
                              <span class="text-sm font-medium text-gray-900">
                                {provider.provider_name}
                              </span>
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
