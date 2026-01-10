import { type Handlers } from "$fresh/server.ts";
import { handleConditionalRequest } from "../../../lib/api/caching.ts";
import { CachePresets } from "../../../lib/api/caching.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";

/**
 * API endpoint to fetch user's watched content
 *
 * GET /api/library/watched
 * - Returns list of content marked as watched by the authenticated user
 * - Includes watched_at timestamp
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Fetch watched content with content details, ratings, and tags
      const watchedContent = await query<{
        tmdb_id: number;
        type: "movie" | "tv" | "documentary";
        title: string;
        poster_path: string | null;
        release_date: string | null;
        watched_at: Date;
        rating: number | null;
        tag_ids: string[] | null;
      }>(
        `SELECT 
          c.tmdb_id,
          c.type,
          c.title,
          c.poster_path,
          c.release_date,
          uc.watched_at,
          uc.rating,
          COALESCE(
            ARRAY_AGG(DISTINCT ct.tag_id) FILTER (WHERE ct.tag_id IS NOT NULL),
            ARRAY[]::uuid[]
          ) AS tag_ids
        FROM user_content uc
        INNER JOIN content c ON uc.content_id = c.id
        LEFT JOIN content_tags ct ON ct.content_id = c.id
        LEFT JOIN tags t ON t.id = ct.tag_id AND t.user_id = $1
        WHERE uc.user_id = $1 AND uc.status = 'watched'
        GROUP BY c.tmdb_id, c.type, c.title, c.poster_path, c.release_date, uc.watched_at, uc.rating
        ORDER BY uc.watched_at DESC`,
        [userId],
      );

      const response = {
        content: watchedContent.map((item) => ({
          tmdb_id: item.tmdb_id,
          type: item.type,
          title: item.title,
          poster_path: item.poster_path,
          release_date: item.release_date,
          watched_at: item.watched_at.toISOString(),
          rating: item.rating,
          tag_ids: item.tag_ids || [],
        })),
      };

      return await handleConditionalRequest(req, response, CachePresets.PRIVATE_5M);
    } catch (error) {
      console.error("Error fetching watched content:", error);
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
