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
import {
  getMovieDetails,
  getTvDetails,
  searchMovies,
  searchTv,
} from "../tmdb/client.ts";
import { getOrCreateContent } from "../content.ts";

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
  // Note: pgvector returns embeddings as strings like "[0.1,0.2,...]"
  const userResult = await query<{ taste_embedding: string | number[] | null }>(
    `SELECT taste_embedding FROM users WHERE id = $1`,
    [userId],
  );

  if (userResult.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }

  const rawTasteEmbedding = userResult[0].taste_embedding;

  // If user has no taste profile, return empty array
  if (!rawTasteEmbedding) {
    return [];
  }

  // Parse embedding from string if needed (pgvector returns as string)
  const tasteEmbedding = typeof rawTasteEmbedding === "string"
    ? JSON.parse(rawTasteEmbedding) as number[]
    : rawTasteEmbedding;

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

/**
 * Generate mood-based recommendations using GPT-4 and TMDB search
 *
 * Uses GPT-4 to understand the mood/context request and generate search queries,
 * then searches TMDB for matching content and filters based on user history.
 *
 * @param userId User ID (UUID)
 * @param moodRequest User's mood/context request (e.g., "I want something light and funny tonight")
 * @param limit Maximum number of recommendations to return (default: 5)
 * @returns Array of mood-based recommendation candidates with explanations
 */
export async function generateMoodBasedRecommendations(
  userId: string,
  moodRequest: string,
  limit: number = 5,
): Promise<RecommendationCandidate[]> {
  // Step 1: Use GPT-4 to understand the mood and generate search queries
  const searchQueries = await generateSearchQueriesFromMood(moodRequest);

  // Step 2: Search TMDB for matching content
  const allTmdbIds: number[] = [];

  for (const searchQuery of searchQueries) {
    try {
      // Search both movies and TV shows
      const movieResults = await searchMovies(searchQuery, 1);
      const tvResults = await searchTv(searchQuery, 1);

      // Collect TMDB IDs from search results
      for (const movie of movieResults.results.slice(0, 3)) {
        allTmdbIds.push(movie.tmdb_id);
      }

      for (const tv of tvResults.results.slice(0, 3)) {
        allTmdbIds.push(tv.tmdb_id);
      }
    } catch (error) {
      console.error(`Error searching for "${searchQuery}":`, error);
      // Continue with other queries
    }
  }

  if (allTmdbIds.length === 0) {
    return [];
  }

  // Fetch full details and create content records
  const contentRecords: ContentRecord[] = [];
  const processedIds = new Set<number>();

  for (const tmdbId of allTmdbIds.slice(0, 15)) { // Limit to avoid too many API calls
    if (processedIds.has(tmdbId)) continue;
    processedIds.add(tmdbId);

    try {
      // Try movie first, then TV show
      let contentRecord: ContentRecord | null = null;
      try {
        const movieDetails = await getMovieDetails(tmdbId);
        await getOrCreateContent(movieDetails, "movie");
        // Fetch from database to get the full record
        const records = await query<ContentRecord>(
          "SELECT * FROM content WHERE tmdb_id = $1",
          [tmdbId],
        );
        if (records.length > 0) {
          contentRecord = records[0];
        }
      } catch {
        try {
          const tvDetails = await getTvDetails(tmdbId);
          await getOrCreateContent(tvDetails, "tv");
          // Fetch from database to get the full record
          const records = await query<ContentRecord>(
            "SELECT * FROM content WHERE tmdb_id = $1",
            [tmdbId],
          );
          if (records.length > 0) {
            contentRecord = records[0];
          }
        } catch (error) {
          console.error(`Error fetching details for TMDB ID ${tmdbId}:`, error);
        }
      }

      if (contentRecord) {
        contentRecords.push(contentRecord);
      }
    } catch (error) {
      console.error(`Error processing TMDB ID ${tmdbId}:`, error);
    }
  }

  if (contentRecords.length === 0) {
    return [];
  }

  // Step 3: Filter out already watched content and dismissed recommendations
  const watchedContentIds = await query<{ content_id: string }>(
    `SELECT DISTINCT content_id 
     FROM user_content 
     WHERE user_id = $1 AND status = 'watched'`,
    [userId],
  );
  const watchedTmdbIds = new Set(
    watchedContentIds.length > 0
      ? (await query<{ tmdb_id: number }>(
        `SELECT tmdb_id FROM content WHERE id = ANY($1)`,
        [watchedContentIds.map((w) => w.content_id)],
      )).map((c) => c.tmdb_id)
      : [],
  );

  const dismissedTmdbIds = await query<{ tmdb_id: number }>(
    `SELECT DISTINCT dr.content_id as tmdb_id
     FROM dismissed_recommendations dr
     INNER JOIN content c ON dr.content_id = c.tmdb_id
     WHERE dr.user_id = $1`,
    [userId],
  );
  const dismissedSet = new Set(dismissedTmdbIds.map((d) => d.tmdb_id));

  const filteredRecords = contentRecords.filter(
    (record) =>
      !watchedTmdbIds.has(record.tmdb_id) &&
      !dismissedSet.has(record.tmdb_id),
  );

  // Step 4: Generate explanations that reference the mood
  const recommendationsWithExplanations = await Promise.all(
    filteredRecords.slice(0, limit).map(async (record) => {
      // Convert ContentRecord to RecommendationCandidate for explanation generation
      const candidate: RecommendationCandidate = {
        ...record,
        similarity: 0.8, // Default similarity for mood-based recommendations
        distance: 0.2,
      };
      try {
        const explanation = await generateMoodBasedExplanation(
          userId,
          candidate,
          moodRequest,
        );
        return {
          ...candidate,
          explanation,
        };
      } catch (error) {
        console.error(
          `Error generating explanation for ${record.title}:`,
          error,
        );
        return {
          ...candidate,
          explanation:
            `Based on your request for "${moodRequest}", we think you'll enjoy "${record.title}".`,
        };
      }
    }),
  );

  return recommendationsWithExplanations;
}

/**
 * Generate search queries from mood request using GPT-4
 *
 * @param moodRequest User's mood/context request
 * @returns Array of search query strings
 */
async function generateSearchQueriesFromMood(
  moodRequest: string,
): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant that understands movie and TV show moods and contexts. Given a user's mood request, generate 3-5 specific search queries that would help find content matching that mood. Return only a JSON array of search query strings, nothing else.",
    },
    {
      role: "user",
      content: `Generate search queries for this mood request: "${moodRequest}"

Return a JSON array of 3-5 search query strings that would help find movies and TV shows matching this mood. Examples:
- For "light and funny": ["comedy", "funny movies", "lighthearted"]
- For "dark thriller": ["thriller", "dark mystery", "suspense"]
- For "feel-good": ["feel good movies", "uplifting", "heartwarming"]

Return only the JSON array, no other text.`,
    },
  ];

  try {
    const response = await generateChatCompletion(messages);
    // Try to parse JSON array from response
    const jsonMatch = response.match(/\[.*\]/s);
    if (jsonMatch) {
      const queries = JSON.parse(jsonMatch[0]);
      if (
        Array.isArray(queries) && queries.every((q) => typeof q === "string")
      ) {
        return queries.slice(0, 5); // Limit to 5 queries
      }
    }
    // Fallback: use the mood request itself as a search query
    return [moodRequest];
  } catch (error) {
    console.error("Error generating search queries from mood:", error);
    // Fallback: use the mood request itself as a search query
    return [moodRequest];
  }
}

/**
 * Generate mood-based explanation for a recommendation
 *
 * @param userId User ID (UUID)
 * @param candidate Recommended content candidate
 * @param moodRequest Original mood request
 * @returns Natural language explanation referencing the mood
 */
async function generateMoodBasedExplanation(
  userId: string,
  candidate: RecommendationCandidate,
  moodRequest: string,
): Promise<string> {
  // Get user's watched content history for context
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

  const candidateYear = candidate.release_date
    ? ` (${new Date(candidate.release_date).getFullYear()})`
    : "";
  const candidateType = candidate.type === "movie" ? "movie" : "TV show";
  const candidateOverview = candidate.overview || "No description available.";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful movie and TV recommendation assistant. Generate brief, personalised explanations for content recommendations that reference the user's mood request. Keep explanations concise (2-3 sentences) and explain why this content matches their mood request.",
    },
    {
      role: "user",
      content: `The user requested: "${moodRequest}"

Here's their viewing history:
${watchedSummary}

Explain why this ${candidateType} "${candidate.title}"${candidateYear} matches their mood request.

Description: ${candidateOverview}

Provide a brief explanation (2-3 sentences) that:
1. References their mood request ("${moodRequest}")
2. Explains why this content matches that mood
3. Optionally references their viewing history if relevant`,
    },
  ];

  try {
    const explanation = await generateChatCompletion(messages);
    return explanation.trim();
  } catch (error) {
    console.error("Error generating mood-based explanation:", error);
    return `Based on your request for "${moodRequest}", we think you'll enjoy "${candidate.title}".`;
  }
}
