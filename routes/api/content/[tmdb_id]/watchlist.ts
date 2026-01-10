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
 * API endpoint to add/remove content from watchlist
 *
 * POST /api/content/[tmdb_id]/watchlist
 * - Adds content to watchlist for the authenticated user
 * - Creates content record if it doesn't exist
 * - Sets status to 'to_watch'
 *
 * DELETE /api/content/[tmdb_id]/watchlist
 * - Removes content from watchlist for the authenticated user
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

      // Add to watchlist (upsert: insert or update if exists)
      await transaction(async (client) => {
        // Check if user_content record exists
        const existing = await client.queryObject<{ id: string }>(
          "SELECT id FROM user_content WHERE user_id = $1 AND content_id = $2",
          [userId, contentId],
        );

        const now = new Date();

        if (existing.rows.length > 0) {
          // Update existing record
          await client.queryObject(
            `UPDATE user_content 
             SET status = 'to_watch', updated_at = $1
             WHERE user_id = $2 AND content_id = $3`,
            [now, userId, contentId],
          );
        } else {
          // Insert new record
          await client.queryObject(
            `INSERT INTO user_content (user_id, content_id, status)
             VALUES ($1, $2, 'to_watch')`,
            [userId, contentId],
          );
        }
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error adding content to watchlist:", error);
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

      // Remove from watchlist (delete user_content record if status is to_watch)
      await query(
        `DELETE FROM user_content 
         WHERE user_id = $1 AND content_id = $2 AND status = 'to_watch'`,
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
      console.error("Error removing content from watchlist:", error);
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
