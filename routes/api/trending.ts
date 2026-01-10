import { type Handlers } from "$fresh/server.ts";
import { type Content, getTrending } from "../../lib/tmdb/client.ts";

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
        return new Response(
          JSON.stringify({ error: "time_window must be 'day' or 'week'" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Validate page number
      if (!Number.isInteger(page) || page < 1) {
        return new Response(
          JSON.stringify({ error: "Page must be a positive integer" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
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

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour (trending updates daily)
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Trending error:", message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch trending content" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
