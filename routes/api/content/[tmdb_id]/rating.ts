import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../../lib/auth/middleware.ts";
import { getOrCreateContent } from "../../../../lib/content.ts";
import { query, transaction } from "../../../../lib/db.ts";
import {
  getMovieDetails,
  getTvDetails,
  type MovieDetails,
  type TvDetails,
} from "../../../../lib/tmdb/client.ts";

/**
 * API endpoint to set user rating for content
 *
 * POST /api/content/[tmdb_id]/rating
 * - Sets rating (1-10 scale with half-point precision) for the authenticated user
 * - Creates content record if it doesn't exist
 * - Creates or updates user_content record with rating
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
        return new Response(
          JSON.stringify({ error: "Invalid content ID" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Parse request body
      const body = await req.json();
      const { rating } = body;

      // Validate rating
      if (typeof rating !== "number" || rating < 0 || rating > 10) {
        return new Response(
          JSON.stringify({ error: "Rating must be between 0 and 10" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Round to half-point precision (0.5 increments)
      const roundedRating = Math.round(rating * 2) / 2;

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

      // Set rating (upsert: insert or update if exists)
      await transaction(async (client) => {
        // Check if user_content record exists
        const existing = await client.queryObject<{ id: string }>(
          "SELECT id FROM user_content WHERE user_id = $1 AND content_id = $2",
          [userId, contentId],
        );

        if (existing.rows.length > 0) {
          // Update existing record with rating
          await client.queryObject(
            `UPDATE user_content 
             SET rating = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND content_id = $3`,
            [roundedRating, userId, contentId],
          );
        } else {
          // Insert new record with rating (default status to 'watched' if no status set)
          await client.queryObject(
            `INSERT INTO user_content (user_id, content_id, status, rating)
             VALUES ($1, $2, 'watched', $3)`,
            [userId, contentId, roundedRating],
          );
        }
      });

      return new Response(
        JSON.stringify({ success: true, rating: roundedRating }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error setting rating:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
  async DELETE(req, ctx) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Get TMDB ID from route params
      const { tmdb_id } = ctx.params;
      const tmdbId = parseInt(tmdb_id, 10);

      // Validate TMDB ID
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid content ID" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get content record
      const content = await query<{ id: string }>(
        "SELECT id FROM content WHERE tmdb_id = $1",
        [tmdbId],
      );

      if (content.length === 0) {
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const contentId = content[0].id;

      // Remove rating (set to NULL)
      await query(
        `UPDATE user_content 
         SET rating = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND content_id = $2`,
        [userId, contentId],
      );

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error removing rating:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
