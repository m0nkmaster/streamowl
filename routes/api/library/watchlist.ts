import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";

/**
 * API endpoint to fetch user's watchlist content
 *
 * GET /api/library/watchlist
 * - Returns list of content marked as 'to_watch' by the authenticated user
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Fetch watchlist content with content details and ratings
      const watchlistContent = await query<{
        tmdb_id: number;
        type: "movie" | "tv" | "documentary";
        title: string;
        poster_path: string | null;
        release_date: string | null;
        created_at: Date;
        rating: number | null;
      }>(
        `SELECT 
          c.tmdb_id,
          c.type,
          c.title,
          c.poster_path,
          c.release_date,
          uc.created_at,
          uc.rating
        FROM user_content uc
        INNER JOIN content c ON uc.content_id = c.id
        WHERE uc.user_id = $1 AND uc.status = 'to_watch'
        ORDER BY uc.created_at DESC`,
        [userId],
      );

      return new Response(
        JSON.stringify({
          content: watchlistContent.map((item) => ({
            tmdb_id: item.tmdb_id,
            type: item.type,
            title: item.title,
            poster_path: item.poster_path,
            release_date: item.release_date,
            added_at: item.created_at.toISOString(),
            rating: item.rating,
          })),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error fetching watchlist content:", error);
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
