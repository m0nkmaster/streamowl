/**
 * User taste profile calculation
 *
 * Calculates user taste profile as weighted average of watched content embeddings.
 * Higher ratings contribute more weight to the taste profile.
 */

import { query } from "../db.ts";

/**
 * Calculate and store user taste profile
 *
 * Aggregates user's watched content embeddings weighted by their ratings.
 * If user has no watched content or no content with embeddings, taste profile
 * is set to NULL.
 *
 * @param userId User ID (UUID)
 * @returns Calculated taste embedding vector or null if insufficient data
 */
export async function calculateAndStoreTasteProfile(
  userId: string,
): Promise<number[] | null> {
  // Fetch watched content with embeddings and ratings
  // Only include content that has embeddings (content_embedding IS NOT NULL)
  // Note: pgvector returns embeddings as strings like "[0.1,0.2,...]"
  const watchedContent = await query<{
    content_embedding: string | number[];
    rating: number | null;
  }>(
    `SELECT 
      c.content_embedding,
      uc.rating
    FROM user_content uc
    INNER JOIN content c ON uc.content_id = c.id
    WHERE uc.user_id = $1 
      AND uc.status = 'watched'
      AND c.content_embedding IS NOT NULL`,
    [userId],
  );

  // If no watched content with embeddings, set taste profile to NULL
  if (watchedContent.length === 0) {
    await query(
      `UPDATE users SET taste_embedding = NULL WHERE id = $1`,
      [userId],
    );
    return null;
  }

  // Calculate weighted average of embeddings
  // Weight by rating: if rating is NULL, use default weight of 5.0
  // Normalise weights so they sum to 1.0
  const embeddings: number[][] = [];
  const weights: number[] = [];

  for (const item of watchedContent) {
    const rating = item.rating ?? 5.0; // Default weight for unrated content
    // Normalise rating to 0-1 scale (rating is 0-10, so divide by 10)
    // Add small epsilon to ensure minimum weight for very low ratings
    const weight = Math.max(0.1, rating / 10);

    // Parse embedding from string if needed (pgvector returns as string)
    const embedding = typeof item.content_embedding === "string"
      ? JSON.parse(item.content_embedding) as number[]
      : item.content_embedding;

    embeddings.push(embedding);
    weights.push(weight);
  }

  // Normalise weights to sum to 1.0
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalisedWeights = weights.map((w) => w / totalWeight);

  // Calculate weighted average embedding
  const dimension = embeddings[0].length; // Should be 1536
  const tasteEmbedding = new Array(dimension).fill(0);

  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    const weight = normalisedWeights[i];

    // Verify dimension matches
    if (embedding.length !== dimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${dimension}, got ${embedding.length}`,
      );
    }

    // Add weighted embedding to taste profile
    for (let j = 0; j < dimension; j++) {
      tasteEmbedding[j] += embedding[j] * weight;
    }
  }

  // Store taste embedding in database
  // pgvector expects the embedding as a string representation: '[0.1, 0.2, ...]'
  const embeddingString = `[${tasteEmbedding.join(",")}]`;

  await query(
    `UPDATE users 
     SET taste_embedding = $1::vector(1536)
     WHERE id = $2`,
    [embeddingString, userId],
  );

  return tasteEmbedding;
}

/**
 * Recalculate taste profile for user
 *
 * Convenience function that recalculates and stores the taste profile.
 * Should be called when user rates content or marks content as watched.
 *
 * @param userId User ID (UUID)
 * @returns Calculated taste embedding vector or null if insufficient data
 */
export async function recalculateTasteProfile(
  userId: string,
): Promise<number[] | null> {
  return await calculateAndStoreTasteProfile(userId);
}
