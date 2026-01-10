/**
 * API endpoint for processing embedding queue
 *
 * Processes pending embedding jobs with rate limiting.
 * Can be called by cron services or scheduled tasks.
 *
 * Requires authentication or API key for security.
 */

import { Handlers } from "$fresh/server.ts";
import { processEmbeddingQueue } from "../../../lib/ai/embedding-queue.ts";

export const handler: Handlers = {
  async POST(req) {
    try {
      // Optional: Add authentication/authorization here
      // For now, allow unauthenticated access but could add API key check
      const apiKey = Deno.env.get("EMBEDDING_PROCESSOR_API_KEY");
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
      const maxJobs = body.maxJobs || 10;
      const delayMs = body.delayMs || 100;

      const startTime = Date.now();
      const successCount = await processEmbeddingQueue(maxJobs, delayMs);
      const duration = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          success: true,
          processed: successCount,
          duration: duration,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error processing embedding queue:", error);
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
  GET(req, ctx) {
    // Allow GET for simple cron triggers
    return handler.POST!(req, ctx);
  },
};
