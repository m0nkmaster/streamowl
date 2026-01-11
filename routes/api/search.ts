import { type Handlers } from "$fresh/server.ts";
import { handleConditionalRequest } from "../../lib/api/caching.ts";
import { CachePresets } from "../../lib/api/caching.ts";
import { type Content, searchMovies, searchTv } from "../../lib/tmdb/client.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../lib/api/errors.ts";

interface SearchResponse {
  results: Content[];
  total_results: number;
  page: number;
  total_pages: number;
}

/**
 * API handler for content search
 * Searches both movies and TV shows, combining results
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const query = url.searchParams.get("q");
      const page = parseInt(url.searchParams.get("page") || "1", 10);

      // Validate query
      if (!query || query.trim().length === 0) {
        return createBadRequestResponse("Search query is required", "q");
      }

      // Validate page number
      if (!Number.isInteger(page) || page < 1) {
        return createBadRequestResponse(
          "Page must be a positive integer",
          "page",
        );
      }

      // Search both movies and TV shows in parallel
      const [movieResults, tvResults] = await Promise.all([
        searchMovies(query.trim(), page).catch(() => ({
          page: 1,
          total_pages: 0,
          total_results: 0,
          results: [] as Content[],
        })),
        searchTv(query.trim(), page).catch(() => ({
          page: 1,
          total_pages: 0,
          total_results: 0,
          results: [] as Content[],
        })),
      ]);

      // Combine results from both movies and TV shows
      const combinedResults: Content[] = [
        ...movieResults.results,
        ...tvResults.results,
      ];

      // Sort combined results by relevance
      // Sort by vote_average (descending), then by vote_count (descending) as tiebreaker
      combinedResults.sort((a, b) => {
        const aVoteAvg = (a.metadata.vote_average as number) || 0;
        const bVoteAvg = (b.metadata.vote_average as number) || 0;
        const aVoteCount = (a.metadata.vote_count as number) || 0;
        const bVoteCount = (b.metadata.vote_count as number) || 0;

        // Sort by vote_average first (higher = more relevant)
        if (aVoteAvg !== bVoteAvg) {
          return bVoteAvg - aVoteAvg;
        }

        // If vote_average is equal, sort by vote_count (more votes = more reliable)
        return bVoteCount - aVoteCount;
      });

      // Calculate combined totals
      const total_results = movieResults.total_results +
        tvResults.total_results;
      const total_pages = Math.max(
        movieResults.total_pages,
        tvResults.total_pages,
      );

      const response: SearchResponse = {
        results: combinedResults,
        total_results,
        page,
        total_pages,
      };

      return await handleConditionalRequest(
        req,
        response,
        CachePresets.PUBLIC_1H,
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to search content",
        req,
        error,
      );
    }
  },
};
