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
 * API endpoint to add/remove content from a custom list
 *
 * POST /api/lists/[list_id]/items
 * - Adds content to a list for the authenticated user
 * - Body: { tmdb_id: number }
 * - Creates content record if it doesn't exist
 * - Sets position to end of list
 *
 * DELETE /api/lists/[list_id]/items
 * - Removes content from a list for the authenticated user
 * - Body: { tmdb_id: number }
 */
export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Get list ID from route params
      const { list_id } = ctx.params;

      // Parse request body
      const body = await req.json();
      const { tmdb_id } = body;

      // Validate TMDB ID
      const tmdbId = parseInt(tmdb_id, 10);
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid content ID" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Verify list exists and belongs to user
      const listResult = await query<{ id: string; user_id: string }>(
        "SELECT id, user_id FROM lists WHERE id = $1",
        [list_id],
      );

      if (listResult.length === 0) {
        return new Response(
          JSON.stringify({ error: "List not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const list = listResult[0];
      if (list.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          {
            status: 403,
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

      // Add to list (check for duplicates, set position to end)
      await transaction(async (client) => {
        // Check if item already exists in list
        const existing = await client.queryObject<{ id: string }>(
          "SELECT id FROM list_items WHERE list_id = $1 AND content_id = $2",
          [list_id, contentId],
        );

        if (existing.rows.length > 0) {
          // Item already in list, return success (idempotent)
          return;
        }

        // Get max position in list
        const maxPositionResult = await client.queryObject<
          { max_position: number | null }
        >(
          "SELECT MAX(position) as max_position FROM list_items WHERE list_id = $1",
          [list_id],
        );

        const nextPosition = (maxPositionResult.rows[0]?.max_position ?? -1) +
          1;

        // Insert new list item
        await client.queryObject(
          `INSERT INTO list_items (list_id, content_id, position)
           VALUES ($1, $2, $3)`,
          [list_id, contentId, nextPosition],
        );
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error adding content to list:", error);
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

      // Get list ID from route params
      const { list_id } = ctx.params;

      // Parse request body
      const body = await req.json();
      const { tmdb_id } = body;

      // Validate TMDB ID
      const tmdbId = parseInt(tmdb_id, 10);
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid content ID" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Verify list exists and belongs to user
      const listResult = await query<{ id: string; user_id: string }>(
        "SELECT id, user_id FROM lists WHERE id = $1",
        [list_id],
      );

      if (listResult.length === 0) {
        return new Response(
          JSON.stringify({ error: "List not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const list = listResult[0];
      if (list.user_id !== userId) {
        return new Response(
          JSON.stringify({ error: "Access denied" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Find content record
      const contentResult = await query<{ id: string }>(
        "SELECT id FROM content WHERE tmdb_id = $1",
        [tmdbId],
      );

      if (contentResult.length === 0) {
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const contentId = contentResult[0].id;

      // Remove from list
      await query(
        "DELETE FROM list_items WHERE list_id = $1 AND content_id = $2",
        [list_id, contentId],
      );

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error removing content from list:", error);
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
