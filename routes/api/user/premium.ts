import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import { createInternalServerErrorResponse } from "../../../lib/api/errors.ts";

interface PremiumStatusResponse {
  isPremium: boolean;
}

/**
 * API endpoint to check if user has premium status
 * Premium status is stored in user preferences as preferences.premium = true
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);

      const result = await query<{ preferences: Record<string, unknown> }>(
        "SELECT preferences FROM users WHERE id = $1",
        [session.userId],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const preferences = result[0].preferences || {};
      const isPremium = preferences.premium === true;

      const response: PremiumStatusResponse = {
        isPremium,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error checking premium status:", error);
      return createInternalServerErrorResponse(
        "Failed to check premium status",
      );
    }
  },
};
