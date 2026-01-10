#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Background processor for streaming availability sync
 *
 * Syncs streaming availability data from TMDB API to the database.
 * Can be run manually or scheduled via cron.
 *
 * Usage:
 *   deno run --allow-net --allow-env scripts/sync-streaming-availability.ts
 *   deno run --allow-net --allow-env scripts/sync-streaming-availability.ts --max-items=100
 *   deno run --allow-net --allow-env scripts/sync-streaming-availability.ts --max-age-hours=48
 */

import {
  getStreamingAvailabilityStats,
  processStreamingSyncJob,
} from "../lib/streaming/sync.ts";

// Parse command line arguments
function parseArgs(): {
  maxItems: number;
  delayMs: number;
  maxAgeHours: number;
  statsOnly: boolean;
} {
  const maxItems = parseInt(
    Deno.args.find((arg) => arg.startsWith("--max-items="))?.split("=")[1] ||
      "50",
  );
  const delayMs = parseInt(
    Deno.args.find((arg) => arg.startsWith("--delay-ms="))?.split("=")[1] ||
      "25",
  );
  const maxAgeHours = parseInt(
    Deno.args.find((arg) => arg.startsWith("--max-age-hours="))?.split(
      "=",
    )[1] ||
      "24",
  );
  const statsOnly = Deno.args.includes("--stats-only");

  return { maxItems, delayMs, maxAgeHours, statsOnly };
}

async function main() {
  const args = parseArgs();

  // If stats-only flag is set, just show stats
  if (args.statsOnly) {
    console.log("Fetching streaming availability statistics...\n");
    const stats = await getStreamingAvailabilityStats();
    console.log("Streaming Availability Statistics:");
    console.log(`  Total content items: ${stats.totalContent}`);
    console.log(`  Content with streaming data: ${stats.contentWithStreaming}`);
    console.log(
      `  Content without streaming data: ${stats.contentWithoutStreaming}`,
    );
    console.log(
      `  Total availability records: ${stats.totalAvailabilityRecords}`,
    );
    console.log(`  Expired records: ${stats.expiredRecords}`);
    Deno.exit(0);
  }

  console.log(
    `Processing streaming availability sync (max: ${args.maxItems}, delay: ${args.delayMs}ms, max age: ${args.maxAgeHours}h)...`,
  );

  const result = await processStreamingSyncJob(
    args.maxItems,
    args.delayMs,
    args.maxAgeHours,
  );

  console.log("\nSync completed:");
  console.log(`  Total processed: ${result.totalProcessed}`);
  console.log(`  Successful: ${result.successCount}`);
  console.log(`  Failed: ${result.failCount}`);
  console.log(`  Providers added/updated: ${result.providersAdded}`);
  console.log(`  Expired records removed: ${result.expiredRemoved}`);
  console.log(`  Duration: ${result.duration}ms`);

  Deno.exit(0);
}

main();
