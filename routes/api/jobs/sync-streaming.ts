/**
 * API endpoint for syncing streaming availability data
 *
 * Processes content items to refresh their streaming availability from TMDB.
 * Can be called by cron services or scheduled tasks.
 *
 * Requires authentication or API key for security.
 */

import { Handlers } from "$fresh/server.ts";
import {
  getStreamingAvailabilityStats,
  processStreamingSyncJob,
} from "../../../lib/streaming/sync.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      // Optional: Add authentication/authorization here
      const apiKey = Deno.env.get("STREAMING_SYNC_API_KEY");
      if (apiKey) {
        const authHeader = req.headers.get("Authorization");
        if (authHeader !== `Bearer ${apiKey}`) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Parse optional parameters from request body
      const body = await req.json().catch(() => ({}));
      const maxItems = body.maxItems || 50;
      const delayMs = body.delayMs || 25;
      const maxAgeHours = body.maxAgeHours || 24;

      const result = await processStreamingSyncJob(
        maxItems,
        delayMs,
        maxAgeHours,
      );

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error processing streaming sync job:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  async GET(_req) {
    try {
      // GET returns stats about streaming availability
      const stats = await getStreamingAvailabilityStats();

      return new Response(
        JSON.stringify({
          success: true,
          stats,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error getting streaming stats:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
