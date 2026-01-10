/**
 * Content embedding generation and storage
 *
 * Provides functions to generate embeddings from content metadata
 * (title, synopsis, genres) and store them in the database.
 */

import { generateEmbedding } from "./openai.ts";
import { query } from "../db.ts";
import type { MovieDetails, TvDetails } from "../tmdb/client.ts";

/**
 * Generate text representation of content for embedding
 *
 * Combines title, synopsis, and genres into a single text string
 * that captures the semantic meaning of the content.
 *
 * @param title Content title
 * @param overview Content synopsis/overview
 * @param genres Array of genre objects with name property
 * @returns Combined text for embedding
 */
export function generateContentText(
  title: string,
  overview: string | null,
  genres: Array<{ id: number; name: string }>,
): string {
  const genreNames = genres.map((g) => g.name).join(", ");

  const parts: string[] = [
    `Title: ${title}`,
  ];

  if (overview) {
    parts.push(`Synopsis: ${overview}`);
  }

  if (genreNames) {
    parts.push(`Genres: ${genreNames}`);
  }

  return parts.join("\n\n");
}

/**
 * Generate and store embedding for content
 *
 * Generates an embedding from the content's title, synopsis, and genres,
 * then stores it in the content table's content_embedding column.
 *
 * @param contentId Content database ID (UUID)
 * @param title Content title
 * @param overview Content synopsis/overview
 * @param genres Array of genre objects with name property
 * @returns Generated embedding vector
 */
export async function generateAndStoreContentEmbedding(
  contentId: string,
  title: string,
  overview: string | null,
  genres: Array<{ id: number; name: string }>,
): Promise<number[]> {
  // Generate text representation
  const contentText = generateContentText(title, overview, genres);

  // Generate embedding
  const embedding = await generateEmbedding(contentText);

  // Store embedding in database
  // pgvector expects the embedding as a string representation: '[0.1, 0.2, ...]'
  // The postgres library will handle the type conversion
  const embeddingString = `[${embedding.join(",")}]`;

  await query(
    `UPDATE content 
     SET content_embedding = $1::vector(1536)
     WHERE id = $2`,
    [embeddingString, contentId],
  );

  return embedding;
}

/**
 * Generate embedding from TMDB details and store for content
 *
 * Convenience function that extracts title, overview, and genres
 * from TMDB details and generates/stores the embedding.
 *
 * @param contentId Content database ID (UUID)
 * @param tmdbDetails TMDB movie or TV details
 * @param contentType Content type ('movie' or 'tv')
 * @returns Generated embedding vector
 */
export async function generateEmbeddingFromTmdbDetails(
  contentId: string,
  tmdbDetails: MovieDetails | TvDetails,
  contentType: "movie" | "tv",
): Promise<number[]> {
  const title = contentType === "movie"
    ? (tmdbDetails as MovieDetails).title
    : (tmdbDetails as TvDetails).name;
  const overview = tmdbDetails.overview || null;
  const genres = tmdbDetails.genres || [];

  return await generateAndStoreContentEmbedding(
    contentId,
    title,
    overview,
    genres,
  );
}

/**
 * Generate embedding for existing content record
 *
 * Fetches content from database and generates embedding from stored data.
 * Note: This requires genres to be stored in metadata or fetched from TMDB.
 *
 * @param contentId Content database ID (UUID)
 * @param tmdbDetails TMDB movie or TV details (for genres)
 * @param contentType Content type ('movie' or 'tv')
 * @returns Generated embedding vector
 */
export async function generateEmbeddingForContent(
  contentId: string,
  tmdbDetails: MovieDetails | TvDetails,
  contentType: "movie" | "tv",
): Promise<number[]> {
  return await generateEmbeddingFromTmdbDetails(
    contentId,
    tmdbDetails,
    contentType,
  );
}
