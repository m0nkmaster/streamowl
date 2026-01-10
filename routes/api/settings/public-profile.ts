import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

/**
 * API endpoint for managing user public profile setting
 * GET: Fetch user's public profile setting
 * POST: Update user's public profile setting
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);

      // Fetch user preferences
      const result = await query<{ preferences: Record<string, unknown> }>(
        "SELECT preferences FROM users WHERE id = $1",
        [session.userId],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const preferences = result[0].preferences || {};
      const publicProfileEnabled = preferences.public_profile_enabled === true;

      return new Response(
        JSON.stringify({
          enabled: publicProfileEnabled,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error fetching public profile setting:", error);
      return createInternalServerErrorResponse(
        "Failed to fetch public profile setting",
      );
    }
  },

  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      const body = await req.json();
      const { enabled } = body;

      // Validate enabled is boolean
      if (typeof enabled !== "boolean") {
        return createBadRequestResponse(
          "enabled must be a boolean",
          "enabled",
        );
      }

      // Update user preferences
      const result = await query<{ preferences: Record<string, unknown> }>(
        `UPDATE users 
         SET preferences = jsonb_set(
           COALESCE(preferences, '{}'::jsonb),
           '{public_profile_enabled}',
           $1::jsonb
         )
         WHERE id = $2
         RETURNING preferences`,
        [JSON.stringify(enabled), session.userId],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      return new Response(
        JSON.stringify({
          success: true,
          enabled: result[0].preferences.public_profile_enabled === true,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error updating public profile setting:", error);
      return createInternalServerErrorResponse(
        "Failed to update public profile setting",
      );
    }
  },
};
