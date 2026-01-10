import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createForbiddenResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
} from "../../../lib/api/errors.ts";

/**
 * API endpoint for updating list settings
 *
 * PATCH /api/lists/[list_id]
 * - Updates list settings (currently only is_public)
 * - Body: { is_public: boolean }
 * - Returns: { list: { id, name, description, is_public, created_at, updated_at } }
 */
export const handler: Handlers = {
  async PATCH(req, ctx) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Get list ID from route params
      const { list_id } = ctx.params;

      // Parse request body
      const body = await req.json();
      const { is_public } = body;

      // Validate is_public is boolean
      if (typeof is_public !== "boolean") {
        return createBadRequestResponse(
          "is_public must be a boolean",
          "is_public",
        );
      }

      // Verify list exists and belongs to user
      const listResult = await query<{
        id: string;
        user_id: string;
        name: string;
        description: string | null;
        is_public: boolean;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, user_id, name, description, is_public, created_at, updated_at
         FROM lists
         WHERE id = $1`,
        [list_id],
      );

      if (listResult.length === 0) {
        return createNotFoundResponse("List not found");
      }

      const list = listResult[0];
      if (list.user_id !== userId) {
        return createForbiddenResponse("You can only update your own lists");
      }

      // Update list
      const updateResult = await query<{
        id: string;
        name: string;
        description: string | null;
        is_public: boolean;
        created_at: Date;
        updated_at: Date;
      }>(
        `UPDATE lists
         SET is_public = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, name, description, is_public, created_at, updated_at`,
        [is_public, list_id],
      );

      if (updateResult.length === 0) {
        throw new Error("Failed to update list");
      }

      const updatedList = updateResult[0];

      return new Response(
        JSON.stringify({
          list: {
            id: updatedList.id,
            name: updatedList.name,
            description: updatedList.description,
            is_public: updatedList.is_public,
            created_at: updatedList.created_at.toISOString(),
            updated_at: updatedList.updated_at.toISOString(),
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return createInternalServerErrorResponse(
        "Failed to update list",
        error,
      );
    }
  },
};
