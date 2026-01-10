import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../lib/auth/middleware.ts";
import {
  generateRecommendationCandidates,
  generateRecommendationExplanation,
  type RecommendationCandidate,
} from "../../lib/ai/recommendations.ts";
import { redisCache } from "../../lib/cache/redis.ts";

interface RecommendationsResponse {
  recommendations: RecommendationCandidate[];
}

/**
 * Generate cache key for user's daily recommendations
 * Includes user ID and current date to ensure daily updates
 */
function getDailyCacheKey(userId: string): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  return `recommendations:${userId}:${today}`;
}

/**
 * API handler for daily personalised recommendations
 * Returns up to 3 recommendations for free tier users with explanations
 * Recommendations are cached per user per day
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);

      // Check cache first
      const cacheKey = getDailyCacheKey(session.userId);
      const cached = await redisCache.get<RecommendationCandidate[]>(cacheKey);

      if (cached) {
        return new Response(JSON.stringify({ recommendations: cached }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, max-age=3600", // Cache for 1 hour on client
          },
        });
      }

      // Generate recommendations (limit 3 for free tier)
      // TODO: Check user tier and adjust limit accordingly
      const limit = 3;
      const candidates = await generateRecommendationCandidates(
        session.userId,
        limit,
      );

      // Generate explanations for each recommendation
      const recommendationsWithExplanations = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const explanation = await generateRecommendationExplanation(
              session.userId,
              candidate,
            );
            return {
              ...candidate,
              explanation,
            };
          } catch (error) {
            console.error(
              `Error generating explanation for ${candidate.title}:`,
              error,
            );
            // Continue without explanation if generation fails
            return candidate;
          }
        }),
      );

      // Cache recommendations for 24 hours (until next day)
      const hoursUntilMidnight = 24 - new Date().getHours();
      const cacheTTL = hoursUntilMidnight * 3600; // Convert to seconds
      await redisCache.set(cacheKey, recommendationsWithExplanations, cacheTTL);

      const response: RecommendationsResponse = {
        recommendations: recommendationsWithExplanations,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=3600", // Cache for 1 hour on client
        },
      });
    } catch (error) {
      // Handle authentication errors
      if (error instanceof Response) {
        return error;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error("Recommendations error:", message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch recommendations" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
