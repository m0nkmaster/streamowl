#!/usr/bin/env -S deno run -A

/**
 * Database connection test script
 *
 * Tests:
 * 1. Basic connection and SELECT query
 * 2. Connection pool with concurrent requests
 */

import { closePool, getPool, query, testConnection } from "../lib/db.ts";

async function testBasicConnection() {
  console.log("Testing basic database connection...");

  try {
    const result = await testConnection();
    if (result) {
      console.log("✓ Basic connection test passed");
    } else {
      throw new Error("Connection test returned unexpected result");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Basic connection test failed:", message);
    throw error;
  }
}

async function testConcurrentRequests() {
  console.log("\nTesting concurrent requests (connection pooling)...");

  // Initialize pool
  getPool();
  const concurrentRequests = 5;
  const promises: Promise<Array<{ request_id: number; timestamp: Date }>>[] = [];

  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(
      query<{ request_id: number; timestamp: Date }>(
        "SELECT $1::int as request_id, NOW() as timestamp",
        [i + 1],
      ),
    );
  }

  try {
    const results = await Promise.all(promises);

    if (results.length === concurrentRequests) {
      console.log(
        `✓ Concurrent requests test passed (${concurrentRequests} requests)`,
      );
      results.forEach((result, index) => {
        console.log(`  Request ${index + 1}:`, result[0]);
      });
    } else {
      throw new Error(
        `Expected ${concurrentRequests} results, got ${results.length}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Concurrent requests test failed:", message);
    throw error;
  }
}

async function main() {
  console.log("Database Connection Tests\n");
  console.log("=".repeat(50));

  try {
    await testBasicConnection();
    await testConcurrentRequests();

    console.log("\n" + "=".repeat(50));
    console.log("✓ All database tests passed!");
  } catch (_error) {
    console.error("\n" + "=".repeat(50));
    console.error("✗ Database tests failed!");
    Deno.exit(1);
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  await main();
}
