import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../../lib/auth/middleware.ts";
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

      // Get tmdb_id from route params
      const tmdbId = parseInt(ctx.params.tmdb_id);
      if (isNaN(tmdbId)) {
        return createBadRequestResponse("Invalid content ID");
      }

      // Parse request body
      const body: ChatRequest = await req.json();
      if (
        !body.message || typeof body.message !== "string" ||
        body.message.trim().length === 0
      ) {
        return createBadRequestResponse("Message is required");
      }

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
      const contentOverview = contentDetails.overview || "No description available.";

      // Build system message with context
      const systemMessage: ChatMessage = {
        role: "system",
        content:
          `You are a helpful movie and TV recommendation assistant. The user is asking about a recommended ${contentTypeLabel} called "${contentTitle}"${contentYear}.

Here's the user's viewing history:
${watchedHistory}

Here's information about the recommended ${contentTypeLabel}:
Title: ${contentTitle}${contentYear}
Type: ${contentTypeLabel}
Description: ${contentOverview}

Provide helpful, contextual answers about this recommendation. Reference the user's viewing history when relevant. Keep responses conversational and concise (2-4 sentences typically, but can be longer if the question requires it).`,
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
