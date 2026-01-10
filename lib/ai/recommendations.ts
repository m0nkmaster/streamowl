/**
 * AI-powered content recommendations
 *
 * Generates recommendation candidates using vector similarity search
 * based on user taste profiles and provides natural language explanations
 * for recommendations using GPT-4.
 */

import { query } from "../db.ts";
import type { ContentRecord } from "../content.ts";
import { type ChatMessage, generateChatCompletion } from "./openai.ts";

/**
 * Recommendation candidate with similarity score
 */
export interface RecommendationCandidate extends ContentRecord {
  similarity: number; // Cosine similarity (1 - distance)
  distance: number; // Cosine distance from taste profile
  explanation?: string; // Natural language explanation for the recommendation
}

/**
 * Generate recommendation candidates using vector similarity search
 *
 * Queries pgvector for content similar to user's taste profile,
 * excluding already watched content, and applies diversity scoring
 * to avoid repetitive recommendations.
 *
 * @param userId User ID (UUID)
 * @param limit Maximum number of candidates to return (default: 20)
 * @returns Array of recommendation candidates ranked by similarity
 */
export async function generateRecommendationCandidates(
  userId: string,
  limit: number = 20,
): Promise<RecommendationCandidate[]> {
  // Step 1: Get user's taste profile
  const userResult = await query<{ taste_embedding: number[] | null }>(
    `SELECT taste_embedding FROM users WHERE id = $1`,
    [userId],
  );

  if (userResult.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }

  const tasteEmbedding = userResult[0].taste_embedding;

  // If user has no taste profile, return empty array
  if (!tasteEmbedding) {
    return [];
  }

  // Step 2: Query pgvector for similar content
  // Exclude already watched content
  // Use cosine distance operator (<=>) for similarity search
  // Lower distance = higher similarity
  const embeddingString = `[${tasteEmbedding.join(",")}]`;

  const candidates = await query<ContentRecord & { distance: number }>(
    `SELECT 
      c.*,
      c.content_embedding <=> $1::vector(1536) AS distance
    FROM content c
    WHERE c.content_embedding IS NOT NULL
      AND c.id NOT IN (
        SELECT content_id 
        FROM user_content 
        WHERE user_id = $2 
          AND status = 'watched'
      )
      AND c.id NOT IN (
        SELECT content_id
        FROM dismissed_recommendations
        WHERE user_id = $2
      )
    ORDER BY c.content_embedding <=> $1::vector(1536)
    LIMIT $3`,
    [embeddingString, userId, limit * 2], // Fetch more for diversity filtering
  );

  if (candidates.length === 0) {
    return [];
  }

  // Step 3: Apply diversity scoring
  // Convert distance to similarity (1 - distance) and apply diversity penalty
  const diversifiedCandidates = applyDiversityScoring(
    candidates.map((c) => ({
      ...c,
      similarity: 1 - c.distance, // Cosine similarity (higher is better)
    })),
    limit,
  );

  return diversifiedCandidates;
}

/**
 * Apply diversity scoring to recommendation candidates
 *
 * Ensures variety in recommendations by penalising candidates that are
 * too similar to already selected items. Uses a simple approach:
 * - Limits consecutive items of the same type
 * - Penalises items that are too similar to previously selected items
 *
 * @param candidates Candidates with similarity scores
 * @param limit Maximum number of candidates to return
 * @returns Diversified candidates
 */
function applyDiversityScoring(
  candidates: Array<ContentRecord & { similarity: number; distance: number }>,
  limit: number,
): RecommendationCandidate[] {
  if (candidates.length <= limit) {
    return candidates;
  }

  const selected: RecommendationCandidate[] = [];
  const remaining = [...candidates];

  // Simple diversity strategy: ensure no more than 3 consecutive items of same type
  let consecutiveSameType = 0;
  let lastType: string | null = null;

  while (selected.length < limit && remaining.length > 0) {
    // Find best candidate that maintains diversity
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      let score = candidate.similarity;

      // Apply diversity penalty
      // Penalise if same type as last selected item (but allow some repetition)
      if (lastType && candidate.type === lastType) {
        if (consecutiveSameType >= 2) {
          // Heavy penalty if already have 2+ consecutive items of same type
          score *= 0.5;
        } else {
          // Light penalty for first repetition
          score *= 0.9;
        }
      }

      // Penalise if too similar to already selected items
      // Check similarity to top 3 selected items
      for (let j = Math.max(0, selected.length - 3); j < selected.length; j++) {
        const selectedCandidate = selected[j];
        // Simple check: if same type and very high similarity, penalise
        if (
          candidate.type === selectedCandidate.type &&
          candidate.similarity > 0.9
        ) {
          score *= 0.7;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    // Select best candidate
    const selectedCandidate = remaining.splice(bestIndex, 1)[0];
    selected.push(selectedCandidate);

    // Update consecutive same type counter
    if (lastType === selectedCandidate.type) {
      consecutiveSameType++;
    } else {
      consecutiveSameType = 1;
      lastType = selectedCandidate.type;
    }
  }

  return selected;
}

/**
 * User watched content item for explanation context
 */
interface WatchedContentItem {
  title: string;
  type: "movie" | "tv" | "documentary";
  rating: number | null;
  release_date: string | null;
}

/**
 * Generate natural language explanation for a recommendation
 *
 * Creates a prompt with user's watched content history and the recommended
 * content, then calls GPT-4 Turbo to generate a personalised explanation.
 *
 * @param userId User ID (UUID)
 * @param candidate Recommended content candidate
 * @returns Natural language explanation for the recommendation
 */
export async function generateRecommendationExplanation(
  userId: string,
  candidate: RecommendationCandidate,
): Promise<string> {
  // Get user's watched content history (top 10 most recent with ratings)
  const watchedContent = await query<WatchedContentItem>(
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

  // Build watched content summary for prompt
  const watchedSummary = watchedContent.length > 0
    ? watchedContent.map((item) => {
      const ratingText = item.rating !== null
        ? ` (rated ${item.rating}/10)`
        : "";
      const year = item.release_date
        ? ` (${new Date(item.release_date).getFullYear()})`
        : "";
      return `- ${item.title}${year}${ratingText}`;
    }).join("\n")
    : "No watched content yet.";

  // Build prompt
  const candidateYear = candidate.release_date
    ? ` (${new Date(candidate.release_date).getFullYear()})`
    : "";
  const candidateType = candidate.type === "movie" ? "movie" : "TV show";
  const candidateOverview = candidate.overview || "No description available.";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful movie and TV recommendation assistant. Generate brief, personalised explanations for content recommendations based on a user's viewing history. Keep explanations concise (2-3 sentences) and reference specific titles from their history when relevant.",
    },
    {
      role: "user",
      content: `Based on this user's viewing history:

${watchedSummary}

Explain why you're recommending this ${candidateType}: "${candidate.title}"${candidateYear}

Description: ${candidateOverview}

Provide a brief, personalised explanation (2-3 sentences) that references specific titles from their history when relevant.`,
    },
  ];

  try {
    const explanation = await generateChatCompletion(messages);
    return explanation.trim();
  } catch (error) {
    console.error("Error generating recommendation explanation:", error);
    // Return a fallback explanation if GPT-4 call fails
    return `Based on your viewing history, we think you'll enjoy "${candidate.title}".`;
  }
}
