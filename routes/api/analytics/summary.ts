/**
 * API endpoint for analytics dashboard summary
 *
 * Returns aggregated analytics data for the dashboard.
 * Only accessible to authenticated users (could be restricted to admins).
 */

import { type Handlers } from "$fresh/server.ts";
import { getAnalyticsSummary } from "../../../lib/analytics/tracker.ts";
import { getSessionToken } from "../../../lib/auth/cookies.ts";
import { verifySessionToken } from "../../../lib/auth/jwt.ts";
import {
  createInternalServerErrorResponse,
  createUnauthorizedResponse,
} from "../../../lib/api/errors.ts";

export const handler: Handlers = {
  async GET(req) {
    try {
      // Require authentication
      const token = getSessionToken(req);
      if (!token) {
        return createUnauthorizedResponse("Authentication required");
      }

      try {
        await verifySessionToken(token);
      } catch {
        return createUnauthorizedResponse("Invalid session");
      }

      // Get days parameter (default 30)
      const url = new URL(req.url);
      const days = parseInt(url.searchParams.get("days") || "30", 10);

      // Get analytics summary
      const summary = await getAnalyticsSummary(days);

      return new Response(JSON.stringify(summary), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to get analytics summary",
        req,
        error,
      );
    }
  },
};
