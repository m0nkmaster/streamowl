import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";

/**
 * API endpoint to fetch user's favourites content
 *
 * GET /api/library/favourites
 * - Returns list of content marked as 'favourite' by the authenticated user
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Fetch favourites content with content details
      const favouritesContent = await query<{
        tmdb_id: number;
        type: "movie" | "tv" | "documentary";
        title: string;
        poster_path: string | null;
        release_date: string | null;
        created_at: Date;
      }>(
        `SELECT 
          c.tmdb_id,
          c.type,
          c.title,
          c.poster_path,
          c.release_date,
          uc.created_at
        FROM user_content uc
        INNER JOIN content c ON uc.content_id = c.id
        WHERE uc.user_id = $1 AND uc.status = 'favourite'
        ORDER BY uc.created_at DESC`,
        [userId],
      );

      return new Response(
        JSON.stringify({
          content: favouritesContent.map((item) => ({
            tmdb_id: item.tmdb_id,
            type: item.type,
            title: item.title,
            poster_path: item.poster_path,
            release_date: item.release_date,
            added_at: item.created_at.toISOString(),
          })),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error fetching favourites content:", error);
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
