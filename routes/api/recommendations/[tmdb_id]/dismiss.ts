import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../../lib/auth/middleware.ts";
import { getOrCreateContent } from "../../../../lib/content.ts";
import { query } from "../../../../lib/db.ts";
import {
  getMovieDetails,
  getTvDetails,
  type MovieDetails,
  type TvDetails,
} from "../../../../lib/tmdb/client.ts";
import { createBadRequestResponse } from "../../../../lib/api/errors.ts";

/**
 * API endpoint to dismiss a recommendation
 *
 * POST /api/recommendations/[tmdb_id]/dismiss
 * - Dismisses a recommendation for the authenticated user
 * - Creates content record if it doesn't exist
 * - Records dismissal to prevent future recommendations
 */
export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Get TMDB ID from route params
      const { tmdb_id } = ctx.params;
      const tmdbId = parseInt(tmdb_id, 10);

      // Validate TMDB ID
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return createBadRequestResponse("Invalid content ID");
      }

      // Fetch content details from TMDB to determine type
      let tmdbDetails: MovieDetails | TvDetails;
      let contentType: "movie" | "tv";

      try {
        tmdbDetails = await getMovieDetails(tmdbId);
        contentType = "movie";
      } catch (_movieError) {
        try {
          tmdbDetails = await getTvDetails(tmdbId);
          contentType = "tv";
        } catch (_tvError) {
          return new Response(
            JSON.stringify({ error: "Content not found" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Get or create content record in database
      const contentId = await getOrCreateContent(tmdbDetails, contentType);

      // Insert dismissal record (idempotent - ON CONFLICT DO NOTHING)
      await query(
        `INSERT INTO dismissed_recommendations (user_id, content_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, content_id) DO NOTHING`,
        [userId, contentId],
      );

      return new Response(
        JSON.stringify({ success: true, message: "Recommendation dismissed" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      // Handle authentication errors
      if (error instanceof Response) {
        return error;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error("Dismiss recommendation error:", message);
      return new Response(
        JSON.stringify({ error: "Failed to dismiss recommendation" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
