import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../lib/auth/middleware.ts";
import { query } from "../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../lib/api/errors.ts";

/**
 * API endpoint for managing custom lists
 *
 * POST /api/lists
 * - Creates a new list for the authenticated user
 * - Body: { name: string, description?: string }
 * - Returns: { list: { id, name, description, is_public, created_at } }
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Parse request body
      const body = await req.json();
      const { name, description } = body;

      // Validate input
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return createBadRequestResponse("List name is required", "name");
      }

      // Validate name length
      if (name.trim().length > 255) {
        return createBadRequestResponse(
          "List name must be 255 characters or less",
          "name",
        );
      }

      // Validate description if provided
      if (description !== undefined && typeof description !== "string") {
        return createBadRequestResponse(
          "Description must be a string",
          "description",
        );
      }

      // Create list in database
      const result = await query<{
        id: string;
        name: string;
        description: string | null;
        is_public: boolean;
        created_at: Date;
      }>(
        `INSERT INTO lists (user_id, name, description, is_public)
         VALUES ($1, $2, $3, FALSE)
         RETURNING id, name, description, is_public, created_at`,
        [userId, name.trim(), description?.trim() || null],
      );

      if (result.length === 0) {
        throw new Error("Failed to create list");
      }

      const list = result[0];

      return new Response(
        JSON.stringify({
          list: {
            id: list.id,
            name: list.name,
            description: list.description,
            is_public: list.is_public,
            created_at: list.created_at.toISOString(),
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to create list",
        error,
      );
    }
  },
};
