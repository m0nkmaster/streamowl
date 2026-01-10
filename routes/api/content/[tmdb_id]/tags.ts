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
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
} from "../../../../lib/api/errors.ts";

interface Tag {
  id: string;
  name: string;
  colour: string;
}

interface ContentTag {
  tag_id: string;
  tag_name: string;
  tag_colour: string;
}

/**
 * API endpoint for tags on content
 *
 * GET /api/content/[tmdb_id]/tags
 * - Returns all tags applied to the content by the authenticated user
 *
 * POST /api/content/[tmdb_id]/tags
 * - Applies a tag to content
 * - Requires: tag_id (string) - UUID of the tag to apply
 * - Creates content record if it doesn't exist
 *
 * DELETE /api/content/[tmdb_id]/tags/[tag_id]
 * - Removes a tag from content
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
        return createBadRequestResponse("Invalid content ID", "tmdb_id");
      }

      // Get content record
      const content = await query<{ id: string }>(
        "SELECT id FROM content WHERE tmdb_id = $1",
        [tmdbId],
      );

      if (content.length === 0) {
        // Content not in database yet, return empty tags array
        return new Response(
          JSON.stringify({ tags: [] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const contentId = content[0].id;

      // Get tags applied to this content by this user
      const contentTags = await query<ContentTag>(
        `SELECT ct.tag_id, t.name AS tag_name, t.colour AS tag_colour
         FROM content_tags ct
         INNER JOIN tags t ON ct.tag_id = t.id
         WHERE ct.content_id = $1 AND t.user_id = $2
         ORDER BY t.name ASC`,
        [contentId, userId],
      );

      const tags = contentTags.map((ct) => ({
        id: ct.tag_id,
        name: ct.tag_name,
        colour: ct.tag_colour,
      }));

      return new Response(
        JSON.stringify({ tags }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to fetch tags",
        error,
      );
    }
  },

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
        return createBadRequestResponse("Invalid content ID", "tmdb_id");
      }

      // Parse request body
      const body = await req.json();
      const { tag_id } = body;

      // Validate tag_id
      if (!tag_id || typeof tag_id !== "string") {
        return createBadRequestResponse(
          "Tag ID is required and must be a string",
          "tag_id",
        );
      }

      // Verify tag exists and belongs to user
      const tag = await query<{ id: string }>(
        "SELECT id FROM tags WHERE id = $1 AND user_id = $2",
        [tag_id, userId],
      );

      if (tag.length === 0) {
        return createNotFoundResponse("Tag not found");
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
          return createNotFoundResponse("Content not found");
        }
      }

      // Get or create content record in database
      const contentId = await getOrCreateContent(tmdbDetails, contentType);

      // Apply tag (use ON CONFLICT to handle duplicate applications gracefully)
      await query(
        `INSERT INTO content_tags (tag_id, content_id)
         VALUES ($1, $2)
         ON CONFLICT (tag_id, content_id) DO NOTHING`,
        [tag_id, contentId],
      );

      // Fetch updated tag info
      const appliedTag = await query<Tag>(
        `SELECT id, name, colour FROM tags WHERE id = $1`,
        [tag_id],
      );

      return new Response(
        JSON.stringify({ tag: appliedTag[0] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to apply tag",
        error,
      );
    }
  },
};
