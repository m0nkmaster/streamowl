/**
 * TMDB (The Movie Database) API client
 *
 * Provides a client for interacting with the TMDB API with rate limiting,
 * caching, and error handling. Rate limit: 50 requests per second.
 */

import { redisCache } from "../cache/redis.ts";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const RATE_LIMIT_REQUESTS_PER_SECOND = 50;
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second

// Default cache TTL: 24 hours (86400 seconds)
// TMDB data doesn't change frequently, so longer cache is beneficial
const DEFAULT_CACHE_TTL_SECONDS = 86400;

/**
 * Rate limiter implementation using a sliding window
 */
class RateLimiter {
  private requests: number[] = [];

  /**
   * Check if a request can be made within rate limits
   * @returns true if request can proceed, false if rate limit exceeded
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Remove requests outside the current window
    this.requests = this.requests.filter((time) => time > windowStart);

    // Check if we're under the limit
    if (this.requests.length < RATE_LIMIT_REQUESTS_PER_SECOND) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  /**
   * Wait until a request can be made
   * @returns Promise that resolves when request can proceed
   */
  async waitForAvailability(): Promise<void> {
    while (!this.canMakeRequest()) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = RATE_LIMIT_WINDOW_MS - (Date.now() - oldestRequest);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }
}

// Singleton rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Get TMDB API key from environment variable
 */
function getApiKey(): string {
  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey) {
    throw new Error(
      "TMDB_API_KEY environment variable is not set. Please set it in your .env file or environment.",
    );
  }
  return apiKey;
}

/**
 * TMDB API error response structure
 */
export interface TMDBError {
  status_code: number;
  status_message: string;
  success: false;
}

/**
 * TMDB API response wrapper
 */
export interface TMDBResponse<T> {
  success: boolean;
  data?: T;
  error?: TMDBError;
}

/**
 * Make a request to the TMDB API with rate limiting, caching, and error handling
 *
 * @param endpoint API endpoint (e.g., "/movie/550")
 * @param params Optional query parameters
 * @param ttlSeconds Optional cache TTL in seconds (default: 24 hours)
 * @returns Response data or throws error
 */
async function request<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
  ttlSeconds: number = DEFAULT_CACHE_TTL_SECONDS,
): Promise<T> {
  // Check cache first
  const cached = await redisCache.getCached<T>(endpoint, params);
  if (cached !== null) {
    return cached;
  }

  // Wait for rate limit availability
  await rateLimiter.waitForAvailability();

  const apiKey = getApiKey();
  const url = new URL(`${TMDB_API_BASE_URL}${endpoint}`);

  // Add API key
  url.searchParams.set("api_key", apiKey);

  // Add additional parameters
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  try {
    const response = await fetch(url.toString());

    // Parse response body first to check for TMDB error structure
    const responseData = await response.json() as T | TMDBError;

    // Check if response is an error (TMDB returns success: false for errors)
    if (
      typeof responseData === "object" &&
      responseData !== null &&
      "success" in responseData &&
      responseData.success === false
    ) {
      const errorData = responseData as TMDBError;
      const errorMessage =
        `TMDB API error (${errorData.status_code}): ${errorData.status_message}`;

      // Throw specific error for 404 (not found)
      if (errorData.status_code === 34) {
        throw new Error(`Movie not found: ${errorMessage}`);
      }

      throw new Error(errorMessage);
    }

    // Check HTTP status code
    if (!response.ok) {
      throw new Error(
        `TMDB API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = responseData as T;

    // Cache successful responses (don't cache errors)
    await redisCache.setCached(endpoint, params, data, ttlSeconds);

    return data;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw our custom errors
      throw error;
    }
    throw new Error(`Unexpected error making TMDB API request: ${error}`);
  }
}

/**
 * Cast member from TMDB API
 */
export interface CastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Crew member from TMDB API
 */
export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Credits from TMDB API
 */
export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

/**
 * Image from TMDB API
 */
export interface Image {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average: number;
  vote_count: number;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Images from TMDB API
 */
export interface Images {
  posters: Image[];
  backdrops: Image[];
}

/**
 * Movie details from TMDB API (with credits and images)
 */
export interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
  genres: Array<{ id: number; name: string }>;
  credits?: Credits;
  images?: Images;
  [key: string]: unknown; // Allow additional fields
}

/**
 * TV details from TMDB API (with credits and images)
 */
export interface TvDetails {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  episode_run_time: number[];
  genres: Array<{ id: number; name: string }>;
  credits?: Credits;
  images?: Images;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Movie search result from TMDB API (simplified version from search endpoint)
 */
export interface TMDBMovieSearchResult {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[]; // Genre IDs from TMDB search results
  [key: string]: unknown; // Allow additional fields
}

/**
 * TV show search result from TMDB API (simplified version from search endpoint)
 */
export interface TMDBTVSearchResult {
  id: number;
  name: string; // TV shows use 'name' instead of 'title'
  overview: string;
  first_air_date: string; // TV shows use 'first_air_date' instead of 'release_date'
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[]; // Genre IDs from TMDB search results
  [key: string]: unknown; // Allow additional fields
}

/**
 * TMDB search response structure for movies
 */
export interface TMDBSearchResponse {
  page: number;
  results: TMDBMovieSearchResult[];
  total_pages: number;
  total_results: number;
}

/**
 * TMDB search response structure for TV shows
 */
export interface TMDBSearchTVResponse {
  page: number;
  results: TMDBTVSearchResult[];
  total_pages: number;
  total_results: number;
}

/**
 * Internal content model matching database schema
 */
export interface Content {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  overview: string | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Paginated search results
 */
export interface SearchResults {
  page: number;
  total_pages: number;
  total_results: number;
  results: Content[];
}

/**
 * Fetch movie details by TMDB ID
 *
 * @param movieId TMDB movie ID
 * @returns Movie details
 * @throws Error if movie not found or API request fails
 */
export async function getMovieById(movieId: number): Promise<MovieDetails> {
  if (!Number.isInteger(movieId) || movieId <= 0) {
    throw new Error(`Invalid movie ID: ${movieId}`);
  }

  const movie = await request<MovieDetails>(`/movie/${movieId}`);
  return movie;
}

/**
 * Fetch full movie details including cast, crew, and images
 *
 * @param movieId TMDB movie ID
 * @returns Movie details with credits and images
 * @throws Error if movie not found or API request fails
 */
export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  if (!Number.isInteger(movieId) || movieId <= 0) {
    throw new Error(`Invalid movie ID: ${movieId}`);
  }

  const movie = await request<MovieDetails>(`/movie/${movieId}`, {
    append_to_response: "credits,images",
  });
  return movie;
}

/**
 * Fetch full TV show details including cast, crew, and images
 *
 * @param tvId TMDB TV show ID
 * @returns TV show details with credits and images
 * @throws Error if TV show not found or API request fails
 */
export async function getTvDetails(tvId: number): Promise<TvDetails> {
  if (!Number.isInteger(tvId) || tvId <= 0) {
    throw new Error(`Invalid TV show ID: ${tvId}`);
  }

  const tv = await request<TvDetails>(`/tv/${tvId}`, {
    append_to_response: "credits,images",
  });
  return tv;
}

/**
 * Map TMDB movie search result to internal content model
 *
 * @param tmdbMovie TMDB movie search result
 * @returns Internal content model
 */
function mapTMDBMovieToContent(tmdbMovie: TMDBMovieSearchResult): Content {
  return {
    tmdb_id: tmdbMovie.id,
    type: "movie",
    title: tmdbMovie.title,
    overview: tmdbMovie.overview || null,
    release_date: tmdbMovie.release_date || null,
    poster_path: tmdbMovie.poster_path || null,
    backdrop_path: tmdbMovie.backdrop_path || null,
    metadata: {
      vote_average: tmdbMovie.vote_average,
      vote_count: tmdbMovie.vote_count,
      genre_ids: tmdbMovie.genre_ids || [],
    },
  };
}

/**
 * Map TMDB TV show search result to internal content model
 *
 * @param tmdbTV TMDB TV show search result
 * @returns Internal content model
 */
function mapTMDBTVToContent(tmdbTV: TMDBTVSearchResult): Content {
  return {
    tmdb_id: tmdbTV.id,
    type: "tv",
    title: tmdbTV.name, // TV shows use 'name' field
    overview: tmdbTV.overview || null,
    release_date: tmdbTV.first_air_date || null, // TV shows use 'first_air_date'
    poster_path: tmdbTV.poster_path || null,
    backdrop_path: tmdbTV.backdrop_path || null,
    metadata: {
      vote_average: tmdbTV.vote_average,
      vote_count: tmdbTV.vote_count,
      genre_ids: tmdbTV.genre_ids || [],
    },
  };
}

/**
 * Search for movies using TMDB API with pagination
 *
 * @param query Search query string
 * @param page Page number (default: 1)
 * @returns Paginated search results mapped to internal content model
 * @throws Error if API request fails
 */
export async function searchMovies(
  query: string,
  page: number = 1,
): Promise<SearchResults> {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("Search query must be a non-empty string");
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Page number must be a positive integer, got: ${page}`);
  }

  const response = await request<TMDBSearchResponse>("/search/movie", {
    query: query.trim(),
    page,
  });

  return {
    page: response.page,
    total_pages: response.total_pages,
    total_results: response.total_results,
    results: response.results.map(mapTMDBMovieToContent),
  };
}

/**
 * Search for TV shows using TMDB API with pagination
 *
 * @param query Search query string
 * @param page Page number (default: 1)
 * @returns Paginated search results mapped to internal content model
 * @throws Error if API request fails
 */
export async function searchTv(
  query: string,
  page: number = 1,
): Promise<SearchResults> {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("Search query must be a non-empty string");
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Page number must be a positive integer, got: ${page}`);
  }

  const response = await request<TMDBSearchTVResponse>("/search/tv", {
    query: query.trim(),
    page,
  });

  return {
    page: response.page,
    total_pages: response.total_pages,
    total_results: response.total_results,
    results: response.results.map(mapTMDBTVToContent),
  };
}

/**
 * Watch provider from TMDB API
 */
export interface WatchProvider {
  display_priority: number;
  logo_path: string;
  provider_id: number;
  provider_name: string;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Watch providers for a specific region
 */
export interface RegionWatchProviders {
  link: string;
  flatrate?: WatchProvider[]; // Subscription services
  rent?: WatchProvider[]; // Rent options
  buy?: WatchProvider[]; // Buy options
  ads?: WatchProvider[]; // Ad-supported services
  free?: WatchProvider[]; // Free services
  [key: string]: unknown; // Allow additional fields
}

/**
 * Watch providers response from TMDB API
 */
export interface WatchProvidersResponse {
  id: number;
  results: Record<string, RegionWatchProviders>; // Key is ISO 3166-1 country code
}

/**
 * Categorised watch providers for a specific region
 */
export interface CategorisedWatchProviders {
  region: string;
  link: string;
  subscription: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  ads: WatchProvider[];
  free: WatchProvider[];
}

/**
 * Supported regions for watch providers
 */
export const SUPPORTED_REGIONS = ["US", "GB", "CA", "AU", "DE", "FR"] as const;

export type SupportedRegion = typeof SUPPORTED_REGIONS[number];

/**
 * Fetch watch providers for a movie by TMDB ID
 *
 * @param movieId TMDB movie ID
 * @returns Watch providers response
 * @throws Error if movie not found or API request fails
 */
export async function getMovieWatchProviders(
  movieId: number,
): Promise<WatchProvidersResponse> {
  if (!Number.isInteger(movieId) || movieId <= 0) {
    throw new Error(`Invalid movie ID: ${movieId}`);
  }

  const providers = await request<WatchProvidersResponse>(
    `/movie/${movieId}/watch/providers`,
  );
  return providers;
}

/**
 * Fetch watch providers for a TV show by TMDB ID
 *
 * @param tvId TMDB TV show ID
 * @returns Watch providers response
 * @throws Error if TV show not found or API request fails
 */
export async function getTvWatchProviders(
  tvId: number,
): Promise<WatchProvidersResponse> {
  if (!Number.isInteger(tvId) || tvId <= 0) {
    throw new Error(`Invalid TV show ID: ${tvId}`);
  }

  const providers = await request<WatchProvidersResponse>(
    `/tv/${tvId}/watch/providers`,
  );
  return providers;
}

/**
 * Filter watch providers by region and categorise by type
 *
 * @param providers Watch providers response from TMDB API
 * @param region ISO 3166-1 country code (e.g., "US", "GB", "CA", "AU", "DE", "FR")
 * @returns Categorised watch providers for the specified region, or null if region not available
 */
export function filterWatchProvidersByRegion(
  providers: WatchProvidersResponse,
  region: SupportedRegion,
): CategorisedWatchProviders | null {
  const regionData = providers.results[region];
  if (!regionData) {
    return null;
  }

  return {
    region,
    link: regionData.link || "",
    subscription: regionData.flatrate || [],
    rent: regionData.rent || [],
    buy: regionData.buy || [],
    ads: regionData.ads || [],
    free: regionData.free || [],
  };
}

/**
 * Get watch providers for a movie filtered by region
 *
 * @param movieId TMDB movie ID
 * @param region ISO 3166-1 country code (default: "US")
 * @returns Categorised watch providers for the specified region, or null if not available
 * @throws Error if movie not found or API request fails
 */
export async function getMovieWatchProvidersByRegion(
  movieId: number,
  region: SupportedRegion = "US",
): Promise<CategorisedWatchProviders | null> {
  const providers = await getMovieWatchProviders(movieId);
  return filterWatchProvidersByRegion(providers, region);
}

/**
 * Get watch providers for a TV show filtered by region
 *
 * @param tvId TMDB TV show ID
 * @param region ISO 3166-1 country code (default: "US")
 * @returns Categorised watch providers for the specified region, or null if not available
 * @throws Error if TV show not found or API request fails
 */
export async function getTvWatchProvidersByRegion(
  tvId: number,
  region: SupportedRegion = "US",
): Promise<CategorisedWatchProviders | null> {
  const providers = await getTvWatchProviders(tvId);
  return filterWatchProvidersByRegion(providers, region);
}

/**
 * Trending time window for TMDB trending API
 */
export type TrendingTimeWindow = "day" | "week";

/**
 * TMDB trending response structure (can contain movies or TV shows)
 */
export interface TMDBTrendingResponse {
  page: number;
  results: Array<TMDBMovieSearchResult | TMDBTVSearchResult>;
  total_pages: number;
  total_results: number;
}

/**
 * Get trending content (movies and TV shows combined) from TMDB API
 *
 * @param timeWindow Time window for trending: "day" or "week" (default: "day")
 * @param page Page number (default: 1)
 * @returns Paginated trending results mapped to internal content model
 * @throws Error if API request fails
 */
export async function getTrending(
  timeWindow: TrendingTimeWindow = "day",
  page: number = 1,
): Promise<SearchResults> {
  if (timeWindow !== "day" && timeWindow !== "week") {
    throw new Error(
      `Invalid time window: ${timeWindow}. Must be "day" or "week"`,
    );
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Page number must be a positive integer, got: ${page}`);
  }

  // Use shorter cache TTL for trending content (1 hour) since it updates daily
  const response = await request<TMDBTrendingResponse>(
    `/trending/all/${timeWindow}`,
    { page },
    3600, // 1 hour cache TTL
  );

  // Map results to internal content model
  // TMDB trending/all returns mixed results, need to check which type each item is
  const mappedResults = response.results.map((item) => {
    // Check if it's a TV show (has 'name' field) or movie (has 'title' field)
    if ("name" in item && "first_air_date" in item) {
      // It's a TV show
      return mapTMDBTVToContent(item as TMDBTVSearchResult);
    } else {
      // It's a movie
      return mapTMDBMovieToContent(item as TMDBMovieSearchResult);
    }
  });

  return {
    page: response.page,
    total_pages: response.total_pages,
    total_results: response.total_results,
    results: mappedResults,
  };
}

/**
 * Video from TMDB API
 */
export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Videos response from TMDB API
 */
export interface VideosResponse {
  id: number;
  results: Video[];
}

/**
 * Fetch videos for a movie by TMDB ID
 *
 * @param movieId TMDB movie ID
 * @returns Videos response
 * @throws Error if movie not found or API request fails
 */
export async function getMovieVideos(
  movieId: number,
): Promise<VideosResponse> {
  if (!Number.isInteger(movieId) || movieId <= 0) {
    throw new Error(`Invalid movie ID: ${movieId}`);
  }

  const videos = await request<VideosResponse>(`/movie/${movieId}/videos`);
  return videos;
}

/**
 * Fetch videos for a TV show by TMDB ID
 *
 * @param tvId TMDB TV show ID
 * @returns Videos response
 * @throws Error if TV show not found or API request fails
 */
export async function getTvVideos(tvId: number): Promise<VideosResponse> {
  if (!Number.isInteger(tvId) || tvId <= 0) {
    throw new Error(`Invalid TV show ID: ${tvId}`);
  }

  const videos = await request<VideosResponse>(`/tv/${tvId}/videos`);
  return videos;
}

/**
 * Extract YouTube trailer key from videos response
 * Prefers official trailers, falls back to first trailer if no official one found
 *
 * @param videos Videos response from TMDB API
 * @returns YouTube video key, or null if no trailer found
 */
export function extractTrailerKey(videos: VideosResponse): string | null {
  if (!videos.results || videos.results.length === 0) {
    return null;
  }

  // Filter for YouTube trailers
  const trailers = videos.results.filter(
    (video) =>
      video.site === "YouTube" &&
      (video.type === "Trailer" || video.type === "Teaser"),
  );

  if (trailers.length === 0) {
    return null;
  }

  // Prefer official trailers
  const officialTrailer = trailers.find((trailer) => trailer.official);
  if (officialTrailer) {
    return officialTrailer.key;
  }

  // Fall back to first trailer
  return trailers[0].key;
}

/**
 * Fetch similar movies for a movie by TMDB ID
 *
 * @param movieId TMDB movie ID
 * @param page Page number (default: 1)
 * @returns Paginated similar movies mapped to internal content model
 * @throws Error if movie not found or API request fails
 */
export async function getMovieSimilar(
  movieId: number,
  page: number = 1,
): Promise<SearchResults> {
  if (!Number.isInteger(movieId) || movieId <= 0) {
    throw new Error(`Invalid movie ID: ${movieId}`);
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Page number must be a positive integer, got: ${page}`);
  }

  const response = await request<TMDBSearchResponse>(
    `/movie/${movieId}/similar`,
    { page },
  );

  return {
    page: response.page,
    total_pages: response.total_pages,
    total_results: response.total_results,
    results: response.results.map(mapTMDBMovieToContent),
  };
}

/**
 * Fetch similar TV shows for a TV show by TMDB ID
 *
 * @param tvId TMDB TV show ID
 * @param page Page number (default: 1)
 * @returns Paginated similar TV shows mapped to internal content model
 * @throws Error if TV show not found or API request fails
 */
export async function getTvSimilar(
  tvId: number,
  page: number = 1,
): Promise<SearchResults> {
  if (!Number.isInteger(tvId) || tvId <= 0) {
    throw new Error(`Invalid TV show ID: ${tvId}`);
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`Page number must be a positive integer, got: ${page}`);
  }

  const response = await request<TMDBSearchTVResponse>(
    `/tv/${tvId}/similar`,
    { page },
  );

  return {
    page: response.page,
    total_pages: response.total_pages,
    total_results: response.total_results,
    results: response.results.map(mapTMDBTVToContent),
  };
}

/**
 * TMDB API client instance
 */
export const tmdbClient = {
  getMovieById,
  getMovieDetails,
  getTvDetails,
  searchMovies,
  searchTv,
  getMovieWatchProviders,
  getTvWatchProviders,
  getMovieWatchProvidersByRegion,
  getTvWatchProvidersByRegion,
  filterWatchProvidersByRegion,
  getTrending,
  getMovieVideos,
  getTvVideos,
  extractTrailerKey,
  getMovieSimilar,
  getTvSimilar,
  request,
};
