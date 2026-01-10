import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../lib/auth/middleware.ts";
import {
  generateRecommendationCandidates,
  generateRecommendationExplanation,
  type RecommendationCandidate,
} from "../../lib/ai/recommendations.ts";
import { redisCache } from "../../lib/cache/redis.ts";
import {
  getRemainingRecommendations,
  hasReachedRecommendationLimit,
  incrementRecommendationUsage,
} from "../../lib/ai/recommendation-rate-limit.ts";

interface RecommendationsResponse {
  recommendations: RecommendationCandidate[];
  rateLimitReached?: boolean;
  remainingRecommendations?: number;
  upgradePrompt?: string;
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
        // Return cached recommendations with rate limit info
        const remaining = await getRemainingRecommendations(session.userId);
        const response: RecommendationsResponse = {
          recommendations: cached,
          remainingRecommendations: remaining,
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, max-age=3600", // Cache for 1 hour on client
          },
        });
      }

      // Check if user has reached daily limit (for free tier users)
      const limitReached = await hasReachedRecommendationLimit(session.userId);
      if (limitReached) {
        const remaining = await getRemainingRecommendations(session.userId);
        const errorResponse: RecommendationsResponse = {
          recommendations: [],
          rateLimitReached: true,
          remainingRecommendations: remaining,
          upgradePrompt:
            "You've reached your daily limit of 3 AI recommendations. Upgrade to premium for unlimited recommendations.",
        };
        return new Response(JSON.stringify(errorResponse), {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      // Generate recommendations (limit 3 for free tier)
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

      // Increment usage counter (only for free tier users)
      await incrementRecommendationUsage(session.userId);

      // Cache recommendations for 24 hours (until next day)
      const hoursUntilMidnight = 24 - new Date().getHours();
      const cacheTTL = hoursUntilMidnight * 3600; // Convert to seconds
      await redisCache.set(cacheKey, recommendationsWithExplanations, cacheTTL);

      // Get remaining recommendations
      const remaining = await getRemainingRecommendations(session.userId);

      const response: RecommendationsResponse = {
        recommendations: recommendationsWithExplanations,
        remainingRecommendations: remaining,
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
