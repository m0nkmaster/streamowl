/**
 * Streaming availability sync module
 *
 * Provides functions to sync streaming availability data from TMDB API
 * to the content_streaming table. Handles rate limiting and batch processing.
 */

import { query } from "../db.ts";
import {
  getMovieWatchProviders,
  getTvWatchProviders,
  SUPPORTED_REGIONS,
  type SupportedRegion,
  type WatchProvidersResponse,
} from "../tmdb/client.ts";
import type { ContentRecord } from "../content.ts";

/**
 * Streaming service record from database
 */
interface StreamingService {
  id: string;
  name: string;
  logo_url: string | null;
  deep_link_template: string | null;
}

/**
 * Content streaming availability record
 */
interface ContentStreamingRecord {
  id: string;
  service_id: string;
  content_id: string;
  region: string;
  type: "subscription" | "rent" | "buy";
  price: number | null;
  available_from: string | null;
  available_until: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Sync result for a single content item
 */
export interface ContentSyncResult {
  contentId: string;
  tmdbId: number;
  success: boolean;
  providersAdded: number;
  errorMessage?: string;
}

/**
 * Overall sync job result
 */
export interface SyncJobResult {
  totalProcessed: number;
  successCount: number;
  failCount: number;
  providersAdded: number;
  expiredRemoved: number;
  duration: number;
}

/**
 * Get or create streaming service by name
 *
 * Returns the service ID if it exists, otherwise creates a new record.
 *
 * @param serviceName Provider name from TMDB
 * @param logoPath TMDB logo path
 * @returns Service ID
 */
async function getOrCreateStreamingService(
  serviceName: string,
  logoPath: string | null,
): Promise<string> {
  // Check if service exists
  const existing = await query<StreamingService>(
    "SELECT * FROM streaming_services WHERE name = $1",
    [serviceName],
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new service
  const logoUrl = logoPath
    ? `https://image.tmdb.org/t/p/original${logoPath}`
    : null;

  const result = await query<{ id: string }>(
    `INSERT INTO streaming_services (name, logo_url)
     VALUES ($1, $2)
     RETURNING id`,
    [serviceName, logoUrl],
  );

  return result[0].id;
}

/**
 * Upsert streaming availability record
 *
 * Inserts or updates a content_streaming record.
 *
 * @param contentId Content database ID
 * @param serviceId Streaming service database ID
 * @param region Region code (e.g., "US", "GB")
 * @param type Availability type (subscription, rent, buy)
 * @param price Optional price for rent/buy
 */
async function upsertStreamingAvailability(
  contentId: string,
  serviceId: string,
  region: string,
  type: "subscription" | "rent" | "buy",
  price: number | null = null,
): Promise<void> {
  await query(
    `INSERT INTO content_streaming (content_id, service_id, region, type, price)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (service_id, content_id, region, type)
     DO UPDATE SET
       price = EXCLUDED.price,
       updated_at = NOW()`,
    [contentId, serviceId, region, type, price],
  );
}

/**
 * Sync streaming availability for a single content item
 *
 * Fetches watch providers from TMDB and updates the database.
 *
 * @param content Content record to sync
 * @param regions Regions to sync availability for
 * @returns Sync result
 */
export async function syncContentStreamingAvailability(
  content: ContentRecord,
  regions: readonly SupportedRegion[] = SUPPORTED_REGIONS,
): Promise<ContentSyncResult> {
  const result: ContentSyncResult = {
    contentId: content.id,
    tmdbId: content.tmdb_id,
    success: false,
    providersAdded: 0,
  };

  try {
    // Fetch watch providers from TMDB
    let providers: WatchProvidersResponse;

    if (content.type === "movie") {
      providers = await getMovieWatchProviders(content.tmdb_id);
    } else {
      providers = await getTvWatchProviders(content.tmdb_id);
    }

    // Process each region
    for (const region of regions) {
      const regionData = providers.results[region];
      if (!regionData) {
        continue;
      }

      // Process subscription (flatrate) providers
      if (regionData.flatrate) {
        for (const provider of regionData.flatrate) {
          const serviceId = await getOrCreateStreamingService(
            provider.provider_name,
            provider.logo_path,
          );
          await upsertStreamingAvailability(
            content.id,
            serviceId,
            region,
            "subscription",
          );
          result.providersAdded++;
        }
      }

      // Process rent providers
      if (regionData.rent) {
        for (const provider of regionData.rent) {
          const serviceId = await getOrCreateStreamingService(
            provider.provider_name,
            provider.logo_path,
          );
          await upsertStreamingAvailability(
            content.id,
            serviceId,
            region,
            "rent",
          );
          result.providersAdded++;
        }
      }

      // Process buy providers
      if (regionData.buy) {
        for (const provider of regionData.buy) {
          const serviceId = await getOrCreateStreamingService(
            provider.provider_name,
            provider.logo_path,
          );
          await upsertStreamingAvailability(
            content.id,
            serviceId,
            region,
            "buy",
          );
          result.providersAdded++;
        }
      }
    }

    result.success = true;
  } catch (error) {
    result.errorMessage = error instanceof Error
      ? error.message
      : String(error);
    console.error(
      `Failed to sync streaming for content ${content.tmdb_id}:`,
      result.errorMessage,
    );
  }

  return result;
}

/**
 * Remove expired streaming availability records
 *
 * Removes records where available_until date has passed.
 *
 * @returns Number of records removed
 */
export async function removeExpiredAvailability(): Promise<number> {
  const result = await query<{ count: string }>(
    `DELETE FROM content_streaming
     WHERE available_until < CURRENT_DATE
     RETURNING id`,
  );

  return result.length;
}

/**
 * Get content items that need streaming availability updates
 *
 * Returns content that either:
 * - Has no streaming availability records
 * - Has streaming records older than the specified age
 *
 * @param limit Maximum number of items to return
 * @param maxAgeHours Maximum age of streaming data before refresh (default: 24 hours)
 * @returns Array of content records
 */
export async function getContentNeedingStreamingSync(
  limit: number = 100,
  maxAgeHours: number = 24,
): Promise<ContentRecord[]> {
  // Get content that either has no streaming data or has stale data
  const results = await query<ContentRecord>(
    `SELECT c.*
     FROM content c
     LEFT JOIN (
       SELECT content_id, MAX(updated_at) as last_updated
       FROM content_streaming
       GROUP BY content_id
     ) cs ON c.id = cs.content_id
     WHERE cs.content_id IS NULL
        OR cs.last_updated < NOW() - INTERVAL '1 hour' * $1
     ORDER BY
       cs.last_updated NULLS FIRST,
       c.updated_at DESC
     LIMIT $2`,
    [maxAgeHours, limit],
  );

  return results;
}

/**
 * Process streaming availability sync job
 *
 * Syncs streaming availability for content items with rate limiting.
 *
 * @param maxItems Maximum number of items to process
 * @param delayMs Delay between API calls in milliseconds (default: 25ms = 40 req/sec)
 * @param maxAgeHours Maximum age of streaming data before refresh (default: 24 hours)
 * @returns Sync job result
 */
export async function processStreamingSyncJob(
  maxItems: number = 50,
  delayMs: number = 25,
  maxAgeHours: number = 24,
): Promise<SyncJobResult> {
  const startTime = Date.now();
  const result: SyncJobResult = {
    totalProcessed: 0,
    successCount: 0,
    failCount: 0,
    providersAdded: 0,
    expiredRemoved: 0,
    duration: 0,
  };

  try {
    // First, remove expired availability
    result.expiredRemoved = await removeExpiredAvailability();

    // Get content needing sync
    const contentToSync = await getContentNeedingStreamingSync(
      maxItems,
      maxAgeHours,
    );

    // Process each content item with rate limiting
    for (const content of contentToSync) {
      const syncResult = await syncContentStreamingAvailability(content);

      result.totalProcessed++;
      if (syncResult.success) {
        result.successCount++;
        result.providersAdded += syncResult.providersAdded;
      } else {
        result.failCount++;
      }

      // Rate limiting: wait between API calls
      if (result.totalProcessed < contentToSync.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  } catch (error) {
    console.error("Error during streaming sync job:", error);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Get streaming availability statistics
 *
 * Returns counts of content with and without streaming data.
 *
 * @returns Statistics object
 */
export async function getStreamingAvailabilityStats(): Promise<{
  totalContent: number;
  contentWithStreaming: number;
  contentWithoutStreaming: number;
  totalAvailabilityRecords: number;
  expiredRecords: number;
}> {
  const [totalContent] = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM content",
  );

  const [contentWithStreaming] = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT content_id) as count FROM content_streaming`,
  );

  const [totalAvailability] = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM content_streaming",
  );

  const [expiredRecords] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM content_streaming
     WHERE available_until < CURRENT_DATE`,
  );

  const total = parseInt(totalContent.count, 10);
  const withStreaming = parseInt(contentWithStreaming.count, 10);

  return {
    totalContent: total,
    contentWithStreaming: withStreaming,
    contentWithoutStreaming: total - withStreaming,
    totalAvailabilityRecords: parseInt(totalAvailability.count, 10),
    expiredRecords: parseInt(expiredRecords.count, 10),
  };
}
