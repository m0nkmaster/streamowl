import { type Handlers } from "$fresh/server.ts";
import { handleConditionalRequest } from "../../lib/api/caching.ts";
import { CachePresets } from "../../lib/api/caching.ts";
import {
  type Content,
  getNowPlayingMovies,
  getOnTheAirTv,
} from "../../lib/tmdb/client.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../lib/api/errors.ts";

interface NewReleasesResponse {
  results: Content[];
  total_results: number;
  page: number;
  total_pages: number;
}

/**
 * API handler for new releases
 * Returns now playing movies and on the air TV shows from TMDB
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const page = parseInt(url.searchParams.get("page") || "1", 10);

      // Validate page number
      if (!Number.isInteger(page) || page < 1) {
        return createBadRequestResponse(
          "Page must be a positive integer",
          "page",
        );
      }

      // Fetch now playing movies and on the air TV shows in parallel
      const [moviesResults, tvResults] = await Promise.all([
        getNowPlayingMovies(page),
        getOnTheAirTv(page),
      ]);

      // Combine results and sort by release date (most recent first)
      const combinedResults = [
        ...moviesResults.results,
        ...tvResults.results,
      ].sort((a, b) => {
        // Sort by release date descending (newest first)
        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
        return dateB - dateA;
      });

      // Filter to only include content with release dates within the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const recentReleases = combinedResults.filter((content) => {
        if (!content.release_date) return false;
        const releaseDate = new Date(content.release_date);
        return releaseDate >= ninetyDaysAgo;
      });

      const response: NewReleasesResponse = {
        results: recentReleases,
        total_results: recentReleases.length,
        page: 1,
        total_pages: 1,
      };

      return await handleConditionalRequest(req, response, CachePresets.PUBLIC_2H);
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to fetch new releases",
        error,
      );
    }
  },
};
