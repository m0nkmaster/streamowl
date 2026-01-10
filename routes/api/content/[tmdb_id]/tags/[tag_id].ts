import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../../../lib/auth/middleware.ts";
import { query } from "../../../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
} from "../../../../../lib/api/errors.ts";

/**
 * API endpoint for removing tags from content
 *
 * DELETE /api/content/[tmdb_id]/tags/[tag_id]
 * - Removes a tag from content
 * - Verifies tag belongs to user before removal
 */
export const handler: Handlers = {
  async DELETE(req, ctx) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Get TMDB ID and tag ID from route params
      const { tmdb_id, tag_id } = ctx.params;
      const tmdbId = parseInt(tmdb_id, 10);

      // Validate TMDB ID
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return createBadRequestResponse("Invalid content ID", "tmdb_id");
      }

      // Validate tag ID
      if (!tag_id || typeof tag_id !== "string") {
        return createBadRequestResponse("Invalid tag ID", "tag_id");
      }

      // Get content record
      const content = await query<{ id: string }>(
        "SELECT id FROM content WHERE tmdb_id = $1",
        [tmdbId],
      );

      if (content.length === 0) {
        return createNotFoundResponse("Content not found");
      }

      const contentId = content[0].id;

      // Verify tag exists and belongs to user
      const tag = await query<{ id: string }>(
        "SELECT id FROM tags WHERE id = $1 AND user_id = $2",
        [tag_id, userId],
      );

      if (tag.length === 0) {
        return createNotFoundResponse("Tag not found");
      }

      // Remove tag from content
      await query(
        `DELETE FROM content_tags 
         WHERE tag_id = $1 AND content_id = $2`,
        [tag_id, contentId],
      );

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to remove tag",
        error,
      );
    }
  },
};
