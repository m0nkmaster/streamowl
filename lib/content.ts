/**
 * Content helper functions for database operations
 *
 * Provides functions to get or create content records from TMDB data
 */

import { query, transaction } from "./db.ts";
import type { MovieDetails, TvDetails } from "./tmdb/client.ts";
import { enqueueEmbeddingJob } from "./ai/embedding-queue.ts";

/**
 * Database content record
 */
export interface ContentRecord {
  id: string;
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  overview: string | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get or create content record from TMDB details
 *
 * If content exists with the given TMDB ID, returns it.
 * Otherwise, creates a new content record from TMDB details.
 *
 * @param tmdbDetails TMDB movie or TV details
 * @param contentType Content type ('movie' or 'tv')
 * @returns Content record ID
 */
export async function getOrCreateContent(
  tmdbDetails: MovieDetails | TvDetails,
  contentType: "movie" | "tv",
): Promise<string> {
  const tmdbId = tmdbDetails.id;
  const title = contentType === "movie"
    ? (tmdbDetails as MovieDetails).title
    : (tmdbDetails as TvDetails).name;
  const overview = tmdbDetails.overview || null;
  const releaseDate = contentType === "movie"
    ? (tmdbDetails as MovieDetails).release_date
    : (tmdbDetails as TvDetails).first_air_date;
  const posterPath = tmdbDetails.poster_path || null;
  const backdropPath = tmdbDetails.backdrop_path || null;

  // Metadata to store additional TMDB data
  const metadata = {
    vote_average: tmdbDetails.vote_average,
    vote_count: tmdbDetails.vote_count,
  };

  return await transaction(async (client) => {
    // Try to find existing content by TMDB ID
    const existing = await client.queryObject<ContentRecord>(
      "SELECT * FROM content WHERE tmdb_id = $1",
      [tmdbId],
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Create new content record
    const result = await client.queryObject<{ id: string }>(
      `INSERT INTO content (
        tmdb_id, type, title, overview, release_date, poster_path, backdrop_path, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        tmdbId,
        contentType,
        title,
        overview,
        releaseDate,
        posterPath,
        backdropPath,
        JSON.stringify(metadata),
      ],
    );

    if (result.rows.length !== 1) {
      throw new Error("Failed to create content record");
    }

    const contentId = result.rows[0].id;

    // Queue embedding generation job for new content
    // Don't await - let it process in background
    enqueueEmbeddingJob(contentId).catch((error) => {
      console.error("Failed to enqueue embedding job:", error);
      // Non-critical error - content was created successfully
    });

    return contentId;
  });
}

/**
 * Get content record by TMDB ID
 *
 * @param tmdbId TMDB content ID
 * @returns Content record or null if not found
 */
export async function getContentByTmdbId(
  tmdbId: number,
): Promise<ContentRecord | null> {
  const results = await query<ContentRecord>(
    "SELECT * FROM content WHERE tmdb_id = $1",
    [tmdbId],
  );

  if (results.length === 0) {
    return null;
  }

  return results[0];
}

/**
 * Get content record by database ID
 *
 * @param contentId Content database ID
 * @returns Content record or null if not found
 */
export async function getContentById(
  contentId: string,
): Promise<ContentRecord | null> {
  const results = await query<ContentRecord>(
    "SELECT * FROM content WHERE id = $1",
    [contentId],
  );

  if (results.length === 0) {
    return null;
  }

  return results[0];
}
