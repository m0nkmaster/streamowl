import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";
import { type SupportedRegion } from "../../../lib/tmdb/client.ts";
import { isSupportedRegion } from "../../../lib/region.ts";

/**
 * API endpoint for managing user region preference
 * GET: Fetch user's region preference
 * POST: Update user's region preference
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

      if (result.rows.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const preferences = result.rows[0].preferences || {};
      const region = preferences.region as SupportedRegion | undefined;

      return new Response(
        JSON.stringify({
          region: region || null,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error fetching region preference:", error);
      return createInternalServerErrorResponse(
        "Failed to fetch region preference",
      );
    }
  },

  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      const body = await req.json();
      const { region } = body;

      // Validate region
      if (!region) {
        return createBadRequestResponse("Region is required", "region");
      }

      if (!isSupportedRegion(region)) {
        return createBadRequestResponse(
          `Invalid region. Supported regions: US, GB, CA, AU, DE, FR`,
          "region",
        );
      }

      // Update user preferences
      const result = await query<{ preferences: Record<string, unknown> }>(
        `UPDATE users 
         SET preferences = jsonb_set(
           COALESCE(preferences, '{}'::jsonb),
           '{region}',
           $1::jsonb
         )
         WHERE id = $2
         RETURNING preferences`,
        [JSON.stringify(region), session.userId],
      );

      if (result.rows.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      return new Response(
        JSON.stringify({
          success: true,
          region: result.rows[0].preferences.region as SupportedRegion,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error updating region preference:", error);
      return createInternalServerErrorResponse(
        "Failed to update region preference",
      );
    }
  },
};
