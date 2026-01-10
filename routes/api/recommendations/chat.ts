import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  type ChatMessage,
  generateChatCompletion,
} from "../../../lib/ai/openai.ts";
import {
  generateMoodBasedRecommendations,
  type RecommendationCandidate,
} from "../../../lib/ai/recommendations.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createUnauthorizedResponse,
} from "../../../lib/api/errors.ts";

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

interface ChatResponse {
  response: string;
  recommendations?: RecommendationCandidate[]; // Mood-based recommendations if applicable
}

/**
 * Check if user is premium
 * Premium status is stored in user preferences as preferences.premium = true
 */
async function isPremiumUser(userId: string): Promise<boolean> {
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
 * Get user's watched content history for context
 */
async function getWatchedContentHistory(userId: string): Promise<string> {
  const watchedContent = await query<{
    title: string;
    type: string;
    release_date: string | null;
    rating: number | null;
  }>(
    `SELECT 
      c.title,
      c.type,
      c.release_date,
      uc.rating
    FROM user_content uc
    INNER JOIN content c ON uc.content_id = c.id
    WHERE uc.user_id = $1 
      AND uc.status = 'watched'
    ORDER BY uc.watched_at DESC
    LIMIT 10`,
    [userId],
  );

  if (watchedContent.length === 0) {
    return "No watched content yet.";
  }

  return watchedContent.map((item) => {
    const ratingText = item.rating !== null ? ` (rated ${item.rating}/10)` : "";
    const year = item.release_date
      ? ` (${new Date(item.release_date).getFullYear()})`
      : "";
    return `- ${item.title}${year}${ratingText}`;
  }).join("\n");
}

/**
 * API handler for general conversational AI chat about recommendations
 * Premium users only - allows discussing recommendations and requesting mood-based recommendations
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
          "This feature is only available for premium users. Please upgrade to access AI chat.",
        );
      }

      // Parse request body
      const body: ChatRequest = await req.json();
      if (
        !body.message || typeof body.message !== "string" ||
        body.message.trim().length === 0
      ) {
        return createBadRequestResponse("Message is required");
      }

      const message = body.message.trim();

      // Check if this is a mood-based recommendation request
      // Look for patterns like "I want", "I need", "recommend me", "suggest", "something", etc.
      const moodPatterns = [
        /I want (something|a|an)/i,
        /I need (something|a|an)/i,
        /recommend (me|something)/i,
        /suggest (me|something)/i,
        /find (me|something)/i,
        /something (light|dark|funny|serious|scary|romantic|action|thriller|comedy|drama)/i,
        /(light|dark|funny|serious|scary|romantic|action|thriller|comedy|drama) (movie|show|film|tv)/i,
        /(tonight|today|now) (I want|I need)/i,
      ];

      const isMoodRequest = moodPatterns.some((pattern) =>
        pattern.test(message)
      );

      // Get user's watched content history for context
      const watchedHistory = await getWatchedContentHistory(session.userId);

      // Build system message
      let systemMessageContent = "";
      if (isMoodRequest) {
        systemMessageContent =
          `You are a helpful movie and TV recommendation assistant. The user is requesting recommendations based on their mood or context: "${message}"

Here's the user's viewing history:
${watchedHistory}

Provide helpful, contextual responses about recommendations that match their mood request. Reference their viewing history when relevant. Keep responses conversational and concise (2-4 sentences typically).`;
      } else {
        systemMessageContent =
          `You are a helpful movie and TV recommendation assistant.

Here's the user's viewing history:
${watchedHistory}

Provide helpful, contextual responses about movie and TV recommendations. Reference their viewing history when relevant. Keep responses conversational and concise (2-4 sentences typically).`;
      }

      // Build conversation messages
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: systemMessageContent,
        },
      ];

      // Add conversation history if provided
      if (body.conversationHistory && Array.isArray(body.conversationHistory)) {
        // Filter to only include user and assistant messages (exclude system messages)
        const historyMessages = body.conversationHistory.filter(
          (msg) => msg.role === "user" || msg.role === "assistant",
        );
        messages.push(...historyMessages);
      }

      // Add current user message
      messages.push({
        role: "user",
        content: message,
      });

      // Generate AI response
      const response = await generateChatCompletion(messages);

      const chatResponse: ChatResponse = {
        response: response.trim(),
      };

      // If this was a mood request, include recommendations
      if (isMoodRequest) {
        try {
          const recommendations = await generateMoodBasedRecommendations(
            session.userId,
            message,
            5,
          );
          chatResponse.recommendations = recommendations;
        } catch (error) {
          console.error("Error generating mood-based recommendations:", error);
          // Continue without recommendations - chat response is still valid
        }
      }

      return new Response(JSON.stringify(chatResponse), {
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
      console.error("Chat API error:", message);
      return createInternalServerErrorResponse(
        "Failed to process chat message",
      );
    }
  },
};
