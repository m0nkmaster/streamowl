import { type Handlers } from "$fresh/server.ts";
import { handleConditionalRequest } from "../../../lib/api/caching.ts";
import { CachePresets } from "../../../lib/api/caching.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";

/**
 * API endpoint to fetch user's custom lists
 *
 * GET /api/library/lists
 * - Returns list of custom lists created by the authenticated user
 * - Includes list metadata and item counts
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Fetch user's lists with item counts
      const lists = await query<{
        id: string;
        name: string;
        description: string | null;
        is_public: boolean;
        created_at: Date;
        updated_at: Date;
        item_count: number;
      }>(
        `SELECT 
          l.id,
          l.name,
          l.description,
          l.is_public,
          l.created_at,
          l.updated_at,
          COALESCE(COUNT(li.id), 0)::INTEGER as item_count
        FROM lists l
        LEFT JOIN list_items li ON l.id = li.list_id
        WHERE l.user_id = $1
        GROUP BY l.id, l.name, l.description, l.is_public, l.created_at, l.updated_at
        ORDER BY l.created_at DESC`,
        [userId],
      );

      const response = {
        lists: lists.map((list) => ({
          id: list.id,
          name: list.name,
          description: list.description,
          is_public: list.is_public,
          created_at: list.created_at.toISOString(),
          updated_at: list.updated_at.toISOString(),
          item_count: list.item_count,
        })),
      };

      return await handleConditionalRequest(
        req,
        response,
        CachePresets.PRIVATE_5M,
      );
    } catch (error) {
      console.error("Error fetching lists:", error);
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
