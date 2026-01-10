import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { isPremiumUser } from "../../../lib/auth/premium.ts";
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

      const isPremium = await isPremiumUser(session.userId);

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
