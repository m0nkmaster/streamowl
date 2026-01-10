/**
 * Embedding job queue for background processing
 *
 * Provides functions to enqueue embedding generation jobs and process them
 * with rate limiting for the OpenAI API.
 */

import { query, transaction } from "../db.ts";
import { generateEmbeddingFromTmdbDetails } from "./embeddings.ts";
import { getMovieDetails, getTvDetails } from "../tmdb/client.ts";
import { getContentById } from "../content.ts";

/**
 * Embedding job record
 */
export interface EmbeddingJob {
  id: string;
  content_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
  processed_at: Date | null;
}

/**
 * Enqueue an embedding generation job for content
 *
 * Creates a job record if one doesn't already exist for the content.
 * Uses unique constraint to prevent duplicate jobs.
 *
 * @param contentId Content database ID (UUID)
 * @returns Job ID or null if job already exists
 */
export async function enqueueEmbeddingJob(
  contentId: string,
): Promise<string | null> {
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO embedding_jobs (content_id, status)
       VALUES ($1, 'pending')
       ON CONFLICT (content_id) WHERE status IN ('pending', 'processing')
       DO NOTHING
       RETURNING id`,
      [contentId],
    );

    if (result.length === 0) {
      // Job already exists or is being processed
      return null;
    }

    return result[0].id;
  } catch (error) {
    console.error("Error enqueueing embedding job:", error);
    throw error;
  }
}

/**
 * Get next pending job from queue
 *
 * Uses SELECT FOR UPDATE SKIP LOCKED to prevent concurrent processing
 * of the same job.
 *
 * @returns Next pending job or null if none available
 */
export async function getNextPendingJob(): Promise<EmbeddingJob | null> {
  const result = await transaction(async (client) => {
    // Lock and fetch next pending job
    const jobResult = await client.queryObject<EmbeddingJob>(
      `SELECT * FROM embedding_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
    );

    if (jobResult.rows.length === 0) {
      return null;
    }

    const job = jobResult.rows[0];

    // Mark as processing
    await client.queryObject(
      `UPDATE embedding_jobs
       SET status = 'processing', updated_at = NOW()
       WHERE id = $1`,
      [job.id],
    );

    return job;
  });

  return result;
}

/**
 * Mark job as completed
 *
 * @param jobId Job ID
 */
export async function markJobCompleted(jobId: string): Promise<void> {
  await query(
    `UPDATE embedding_jobs
     SET status = 'completed', processed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [jobId],
  );
}

/**
 * Mark job as failed
 *
 * @param jobId Job ID
 * @param errorMessage Error message
 */
export async function markJobFailed(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  await query(
    `UPDATE embedding_jobs
     SET status = 'failed', error_message = $1, updated_at = NOW(), processed_at = NOW()
     WHERE id = $2`,
    [errorMessage, jobId],
  );
}

/**
 * Reset stuck processing jobs
 *
 * Resets jobs that have been in 'processing' status for more than 5 minutes
 * back to 'pending' status. This handles cases where a worker crashed.
 *
 * @returns Number of jobs reset
 */
export async function resetStuckJobs(): Promise<number> {
  const result = await query<{ count: string }>(
    `UPDATE embedding_jobs
     SET status = 'pending', updated_at = NOW()
     WHERE status = 'processing'
       AND updated_at < NOW() - INTERVAL '5 minutes'
     RETURNING id`,
  );

  return result.length;
}

/**
 * Process a single embedding job
 *
 * Fetches content and TMDB details, then generates and stores embedding.
 *
 * @param job Embedding job to process
 * @returns True if successful, false otherwise
 */
export async function processEmbeddingJob(
  job: EmbeddingJob,
): Promise<boolean> {
  try {
    // Fetch content record
    const content = await getContentById(job.content_id);
    if (!content) {
      await markJobFailed(job.id, "Content not found");
      return false;
    }

    // Fetch TMDB details to get genres
    let tmdbDetails;
    let contentType: "movie" | "tv";

    try {
      tmdbDetails = await getMovieDetails(content.tmdb_id);
      contentType = "movie";
    } catch (_movieError) {
      try {
        tmdbDetails = await getTvDetails(content.tmdb_id);
        contentType = "tv";
      } catch (_tvError) {
        await markJobFailed(
          job.id,
          `Failed to fetch TMDB details for content ${content.tmdb_id}`,
        );
        return false;
      }
    }

    // Generate and store embedding
    await generateEmbeddingFromTmdbDetails(
      job.content_id,
      tmdbDetails,
      contentType,
    );

    // Mark job as completed
    await markJobCompleted(job.id);

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await markJobFailed(job.id, errorMessage);
    return false;
  }
}

/**
 * Process embedding jobs with rate limiting
 *
 * Processes jobs from the queue with rate limiting to respect OpenAI API limits.
 * Processes up to maxJobs jobs, waiting between batches to respect rate limits.
 *
 * @param maxJobs Maximum number of jobs to process (default: 10)
 * @param delayMs Delay between jobs in milliseconds (default: 100ms = 10 req/sec)
 * @returns Number of jobs processed successfully
 */
export async function processEmbeddingQueue(
  maxJobs: number = 10,
  delayMs: number = 100,
): Promise<number> {
  let processed = 0;
  let successCount = 0;

  // Reset any stuck jobs first
  await resetStuckJobs();

  while (processed < maxJobs) {
    const job = await getNextPendingJob();

    if (!job) {
      // No more pending jobs
      break;
    }

    const success = await processEmbeddingJob(job);
    if (success) {
      successCount++;
    }

    processed++;

    // Rate limiting: wait between jobs
    if (processed < maxJobs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return successCount;
}
