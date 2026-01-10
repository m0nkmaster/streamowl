import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../../lib/auth/middleware.ts";
import { query } from "../../../../lib/db.ts";

/**
 * API endpoint to get user's content status
 *
 * GET /api/content/[tmdb_id]/status
 * - Returns the user's status for the content (watched, to_watch, favourite, or null)
 */
export const handler: Handlers = {
  async GET(req, ctx) {
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
        // Content not in database yet, return null status
        return new Response(
          JSON.stringify({ status: null }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const contentId = content[0].id;

      // Get user_content status
      const userContent = await query<{
        status: "watched" | "to_watch" | "favourite";
        watched_at: Date | null;
      }>(
        "SELECT status, watched_at FROM user_content WHERE user_id = $1 AND content_id = $2",
        [userId, contentId],
      );

      if (userContent.length === 0) {
        return new Response(
          JSON.stringify({ status: null }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          status: userContent[0].status,
          watched_at: userContent[0].watched_at?.toISOString() || null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error fetching content status:", error);
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
