#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Background processor for embedding generation queue
 *
 * Processes pending embedding jobs with rate limiting.
 * Can be run manually or scheduled via cron.
 *
 * Usage:
 *   deno run --allow-net --allow-env scripts/process-embedding-queue.ts
 *   deno run --allow-net --allow-env scripts/process-embedding-queue.ts --max-jobs 20
 */

import { processEmbeddingQueue } from "../lib/ai/embedding-queue.ts";

const maxJobs = parseInt(
  Deno.args.find((arg) => arg.startsWith("--max-jobs="))?.split("=")[1] || "10",
);
const delayMs = parseInt(
  Deno.args.find((arg) => arg.startsWith("--delay-ms="))?.split("=")[1] ||
    "100",
);

console.log(
  `Processing embedding queue (max: ${maxJobs}, delay: ${delayMs}ms)...`,
);

const startTime = Date.now();
const successCount = await processEmbeddingQueue(maxJobs, delayMs);
const duration = Date.now() - startTime;

console.log(`Processed ${successCount} jobs successfully in ${duration}ms`);

Deno.exit(0);
