import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import {
  generateMoodBasedRecommendations,
  type RecommendationCandidate,
} from "../../../lib/ai/recommendations.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createUnauthorizedResponse,
} from "../../../lib/api/errors.ts";

interface MoodRecommendationsRequest {
  mood: string;
  limit?: number;
}

interface MoodRecommendationsResponse {
  recommendations: RecommendationCandidate[];
}

/**
 * Check if user is premium
 * Premium status is stored in user preferences as preferences.premium = true
 */
async function isPremiumUser(userId: string): Promise<boolean> {
  const { query } = await import("../../../lib/db.ts");
  const result = await query<{ preferences: Record<string, unknown> }>(
    "SELECT preferences FROM users WHERE id = $1",
    [userId],
  );

  if (result.length === 0) {
    return false;
  }

  const preferences = result[0].preferences || {};
  return preferences.premium === true;
}

/**
 * API handler for mood-based recommendations
 * Premium users only - allows requesting recommendations by mood/context
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);

      // Check if user is premium
      const isPremium = await isPremiumUser(session.userId);
      if (!isPremium) {
        return createUnauthorizedResponse(
          "This feature is only available for premium users. Please upgrade to access mood-based recommendations.",
        );
      }

      // Parse request body
      const body: MoodRecommendationsRequest = await req.json();
      if (
        !body.mood || typeof body.mood !== "string" ||
        body.mood.trim().length === 0
      ) {
        return createBadRequestResponse("Mood request is required");
      }

      const limit = body.limit && body.limit > 0 && body.limit <= 10
        ? body.limit
        : 5;

      // Generate mood-based recommendations
      const recommendations = await generateMoodBasedRecommendations(
        session.userId,
        body.mood.trim(),
        limit,
      );

      const response: MoodRecommendationsResponse = {
        recommendations,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      // Handle authentication errors
      if (error instanceof Response) {
        return error;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error("Mood recommendations API error:", message);
      return createInternalServerErrorResponse(
        "Failed to generate mood-based recommendations",
      );
    }
  },
};
