import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../../lib/auth/middleware.ts";
import { isPremiumUser } from "../../../../lib/auth/premium.ts";
import { query } from "../../../../lib/db.ts";
import {
  type ChatMessage,
  generateChatCompletion,
} from "../../../../lib/ai/openai.ts";
import { getOrCreateContent } from "../../../../lib/content.ts";
import {
  getMovieDetails,
  getTvDetails,
  type MovieDetails,
  type TvDetails,
} from "../../../../lib/tmdb/client.ts";
import {
  generateMoodBasedRecommendations,
  type RecommendationCandidate,
} from "../../../../lib/ai/recommendations.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createUnauthorizedResponse,
} from "../../../../lib/api/errors.ts";

interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

interface ChatResponse {
  response: string;
  recommendations?: RecommendationCandidate[]; // Mood-based recommendations if applicable
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
 * API handler for conversational AI chat about recommendations
 * Premium users only - allows discussing recommendations with AI
 */
export const handler: Handlers = {
  async POST(req, ctx) {
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

      // Get tmdb_id from route params
      const tmdbId = parseInt(ctx.params.tmdb_id);
      if (isNaN(tmdbId)) {
        return createBadRequestResponse("Invalid content ID");
      }

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

      // Fetch full content details from TMDB for context
      // Try movie first, then TV show
      let contentDetails: MovieDetails | TvDetails;
      let contentType: "movie" | "tv";
      try {
        try {
          contentDetails = await getMovieDetails(tmdbId);
          contentType = "movie";
        } catch {
          contentDetails = await getTvDetails(tmdbId);
          contentType = "tv";
        }
      } catch (error) {
        console.error("Error fetching content details:", error);
        return createBadRequestResponse("Failed to fetch content details");
      }

      // Get or create content record
      await getOrCreateContent(contentDetails, contentType);

      // Get user's watched content history for context
      const watchedHistory = await getWatchedContentHistory(session.userId);

      // Build conversation context
      const releaseDate = contentType === "movie"
        ? (contentDetails as MovieDetails).release_date
        : (contentDetails as TvDetails).first_air_date;
      const contentYear = releaseDate
        ? ` (${new Date(releaseDate).getFullYear()})`
        : "";
      const contentTypeLabel = contentType === "movie" ? "movie" : "TV show";
      const contentTitle = contentType === "movie"
        ? (contentDetails as MovieDetails).title
        : (contentDetails as TvDetails).name;
      const contentOverview = contentDetails.overview ||
        "No description available.";

      // Build system message with context
      // If it's a mood request, adjust the system message accordingly
      let systemMessageContent = "";
      if (isMoodRequest) {
        systemMessageContent =
          `You are a helpful movie and TV recommendation assistant. The user is asking about a recommended ${contentTypeLabel} called "${contentTitle}"${contentYear}, but they're also requesting recommendations based on their mood: "${message}"

Here's the user's viewing history:
${watchedHistory}

Here's information about the recommended ${contentTypeLabel}:
Title: ${contentTitle}${contentYear}
Type: ${contentTypeLabel}
Description: ${contentOverview}

Provide helpful, contextual answers. If the user is asking for mood-based recommendations, acknowledge their request and provide relevant suggestions. Reference the user's viewing history when relevant. Keep responses conversational and concise (2-4 sentences typically, but can be longer if the question requires it).`;
      } else {
        systemMessageContent =
          `You are a helpful movie and TV recommendation assistant. The user is asking about a recommended ${contentTypeLabel} called "${contentTitle}"${contentYear}.

Here's the user's viewing history:
${watchedHistory}

Here's information about the recommended ${contentTypeLabel}:
Title: ${contentTitle}${contentYear}
Type: ${contentTypeLabel}
Description: ${contentOverview}

Provide helpful, contextual answers about this recommendation. Reference the user's viewing history when relevant. Keep responses conversational and concise (2-4 sentences typically, but can be longer if the question requires it).`;
      }

      const systemMessage: ChatMessage = {
        role: "system",
        content: systemMessageContent,
      };

      // Build conversation messages
      const messages: ChatMessage[] = [systemMessage];

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
        content: body.message.trim(),
      });

      // Generate AI response
      const response = await generateChatCompletion(messages);

      const chatResponse: ChatResponse = {
        response: response.trim(),
      };

      // If this was a mood request, include recommendations
      if (isMoodRequest) {
        const recommendations = await generateMoodBasedRecommendations(
          session.userId,
          message,
          5,
        );
        chatResponse.recommendations = recommendations;
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
