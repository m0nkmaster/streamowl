import { type Handlers } from "$fresh/server.ts";
import { handleConditionalRequest } from "../../lib/api/caching.ts";
import { CachePresets } from "../../lib/api/caching.ts";
import { requireAuthForApi } from "../../lib/auth/middleware.ts";
import { query } from "../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../lib/api/errors.ts";

interface Tag {
  id: string;
  name: string;
  colour: string;
  created_at: string;
}

/**
 * API endpoint for user tags
 *
 * GET /api/tags
 * - Returns all tags created by the authenticated user
 *
 * POST /api/tags
 * - Creates a new tag for the authenticated user
 * - Requires: name (string), colour (string, optional, defaults to #3B82F6)
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Fetch user's tags
      const tags = await query<Tag>(
        "SELECT id, name, colour, created_at FROM tags WHERE user_id = $1 ORDER BY name ASC",
        [userId],
      );

      const response = { tags };
      return await handleConditionalRequest(
        req,
        response,
        CachePresets.PRIVATE_5M,
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to fetch tags",
        error,
      );
    }
  },

  async POST(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Parse request body
      const body = await req.json();
      const { name, colour } = body;

      // Validate name
      if (!name || typeof name !== "string") {
        return createBadRequestResponse(
          "Tag name is required and must be a string",
          "name",
        );
      }

      // Trim and validate name length
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return createBadRequestResponse(
          "Tag name cannot be empty",
          "name",
        );
      }

      if (trimmedName.length > 255) {
        return createBadRequestResponse(
          "Tag name must be less than 255 characters",
          "name",
        );
      }

      // Validate colour (hex colour code)
      const defaultColour = "#3B82F6";
      let tagColour = colour || defaultColour;

      if (typeof tagColour !== "string") {
        tagColour = defaultColour;
      }

      // Validate hex colour format (#RRGGBB)
      const hexColourRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexColourRegex.test(tagColour)) {
        tagColour = defaultColour;
      }

      // Create tag (use ON CONFLICT to handle duplicate names gracefully)
      const result = await query<Tag>(
        `INSERT INTO tags (user_id, name, colour)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, name) DO UPDATE
         SET colour = $3, updated_at = CURRENT_TIMESTAMP
         RETURNING id, name, colour, created_at`,
        [userId, trimmedName, tagColour],
      );

      if (result.length !== 1) {
        return createInternalServerErrorResponse("Failed to create tag");
      }

      return new Response(
        JSON.stringify({ tag: result[0] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to create tag",
        error,
      );
    }
  },
};
