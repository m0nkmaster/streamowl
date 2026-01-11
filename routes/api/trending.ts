import { type Handlers } from "$fresh/server.ts";
import { handleConditionalRequest } from "../../lib/api/caching.ts";
import { CachePresets } from "../../lib/api/caching.ts";
import { type Content, getTrending } from "../../lib/tmdb/client.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../lib/api/errors.ts";

interface TrendingResponse {
  results: Content[];
  total_results: number;
  page: number;
  total_pages: number;
}

/**
 * API handler for trending content
 * Returns trending movies and TV shows from TMDB
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const timeWindow = (url.searchParams.get("time_window") || "day") as
        | "day"
        | "week";
      const page = parseInt(url.searchParams.get("page") || "1", 10);

      // Validate time window
      if (timeWindow !== "day" && timeWindow !== "week") {
        return createBadRequestResponse(
          "time_window must be 'day' or 'week'",
          "time_window",
        );
      }

      // Validate page number
      if (!Number.isInteger(page) || page < 1) {
        return createBadRequestResponse(
          "Page must be a positive integer",
          "page",
        );
      }

      // Fetch trending content
      const trendingResults = await getTrending(timeWindow, page);

      const response: TrendingResponse = {
        results: trendingResults.results,
        total_results: trendingResults.total_results,
        page: trendingResults.page,
        total_pages: trendingResults.total_pages,
      };

      return await handleConditionalRequest(
        req,
        response,
        CachePresets.PUBLIC_1H,
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to fetch trending content",
        error,
      );
    }
  },
};
