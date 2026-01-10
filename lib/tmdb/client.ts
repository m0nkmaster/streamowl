/**
 * TMDB (The Movie Database) API client
 *
 * Provides a client for interacting with the TMDB API with rate limiting
 * and error handling. Rate limit: 50 requests per second.
 */

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const RATE_LIMIT_REQUESTS_PER_SECOND = 50;
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second

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
 * Make a request to the TMDB API with rate limiting and error handling
 *
 * @param endpoint API endpoint (e.g., "/movie/550")
 * @param params Optional query parameters
 * @returns Response data or throws error
 */
async function request<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
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
      const errorMessage = `TMDB API error (${errorData.status_code}): ${errorData.status_message}`;
      
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

    return responseData as T;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw our custom errors
      throw error;
    }
    throw new Error(`Unexpected error making TMDB API request: ${error}`);
  }
}

/**
 * Movie details from TMDB API
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
  [key: string]: unknown; // Allow additional fields
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
 * TMDB API client instance
 */
export const tmdbClient = {
  getMovieById,
  request,
};
