/**
 * OMDb (Open Movie Database) API client
 *
 * Provides a client for fetching ratings from OMDb, including:
 * - IMDb ratings
 * - Rotten Tomatoes scores
 * - Metacritic scores
 *
 * Requires OMDB_API_KEY environment variable.
 * API documentation: https://www.omdbapi.com/
 */

import { redisCache } from "../cache/redis.ts";

const OMDB_API_BASE_URL = "https://www.omdbapi.com";

// Cache TTL: 7 days (ratings don't change frequently)
const CACHE_TTL_SECONDS = 604800;

/**
 * Get OMDb API key from environment variable
 * Returns null if not configured (optional feature)
 */
function getApiKey(): string | null {
  return Deno.env.get("OMDB_API_KEY") || null;
}

/**
 * Individual rating from a source
 */
export interface Rating {
  Source: string;
  Value: string;
}

/**
 * OMDb API response for a movie/TV show
 */
export interface OMDbResponse {
  Title?: string;
  Year?: string;
  Rated?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Writer?: string;
  Actors?: string;
  Plot?: string;
  Language?: string;
  Country?: string;
  Awards?: string;
  Poster?: string;
  Ratings?: Rating[];
  Metascore?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID?: string;
  Type?: string;
  totalSeasons?: string;
  Response: "True" | "False";
  Error?: string;
}

/**
 * Aggregated ratings from multiple sources
 */
export interface AggregateRatings {
  imdb: {
    rating: number | null;
    votes: string | null;
  };
  rottenTomatoes: {
    score: number | null;
    certified?: boolean;
  };
  metacritic: {
    score: number | null;
  };
}

/**
 * Parse IMDb rating string to number
 * @param ratingStr Rating string like "8.1"
 * @returns Parsed number or null
 */
function parseImdbRating(ratingStr: string | undefined): number | null {
  if (!ratingStr || ratingStr === "N/A") return null;
  const parsed = parseFloat(ratingStr);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse Rotten Tomatoes percentage to number
 * @param scoreStr Score string like "91%"
 * @returns Parsed number (0-100) or null
 */
function parseRottenTomatoesScore(scoreStr: string): number | null {
  const match = scoreStr.match(/^(\d+)%$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Parse Metacritic score to number
 * @param scoreStr Score string like "84/100" or "84"
 * @returns Parsed number (0-100) or null
 */
function parseMetacriticScore(scoreStr: string | undefined): number | null {
  if (!scoreStr || scoreStr === "N/A") return null;

  // Handle "84/100" format
  const matchWithDenom = scoreStr.match(/^(\d+)\/100$/);
  if (matchWithDenom) {
    return parseInt(matchWithDenom[1], 10);
  }

  // Handle plain number format
  const parsed = parseInt(scoreStr, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Extract aggregate ratings from OMDb response
 * @param response OMDb API response
 * @returns Aggregated ratings object
 */
function extractRatings(response: OMDbResponse): AggregateRatings {
  const ratings: AggregateRatings = {
    imdb: {
      rating: parseImdbRating(response.imdbRating),
      votes: response.imdbVotes !== "N/A" ? response.imdbVotes || null : null,
    },
    rottenTomatoes: {
      score: null,
    },
    metacritic: {
      score: parseMetacriticScore(response.Metascore),
    },
  };

  // Extract Rotten Tomatoes from Ratings array
  if (response.Ratings) {
    const rtRating = response.Ratings.find(
      (r) => r.Source === "Rotten Tomatoes",
    );
    if (rtRating) {
      ratings.rottenTomatoes.score = parseRottenTomatoesScore(rtRating.Value);
    }
  }

  return ratings;
}

/**
 * Fetch ratings by IMDb ID
 *
 * @param imdbId IMDb ID (e.g., "tt0111161")
 * @returns Aggregate ratings from multiple sources, or null if not found
 */
export async function getRatingsByImdbId(
  imdbId: string,
): Promise<AggregateRatings | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    // OMDb is optional - return null if not configured
    return null;
  }

  if (!imdbId || !imdbId.startsWith("tt")) {
    return null;
  }

  // Check cache first
  const cacheKey = `omdb:${imdbId}`;
  const cached = await redisCache.getCached<AggregateRatings>(cacheKey, {});
  if (cached !== null) {
    return cached;
  }

  try {
    const url = new URL(OMDB_API_BASE_URL);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("i", imdbId);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`OMDb API request failed: ${response.status}`);
      return null;
    }

    const data: OMDbResponse = await response.json();

    if (data.Response === "False") {
      // Movie not found in OMDb
      return null;
    }

    const ratings = extractRatings(data);

    // Cache the result
    await redisCache.setCached(cacheKey, {}, ratings, CACHE_TTL_SECONDS);

    return ratings;
  } catch (error) {
    console.error("OMDb API error:", error);
    return null;
  }
}

/**
 * Check if OMDb API is configured
 * @returns true if OMDB_API_KEY is set
 */
export function isOmdbConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * OMDb API client instance
 */
export const omdbClient = {
  getRatingsByImdbId,
  isOmdbConfigured,
};
