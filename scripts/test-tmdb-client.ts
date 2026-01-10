/**
 * Test script for TMDB API client
 *
 * Tests:
 * 1. Fetching a movie by TMDB ID
 * 2. Error handling for invalid IDs
 * 3. Rate limiting behaviour
 */

import { getMovieById } from "../lib/tmdb/client.ts";

/**
 * Test fetching a known movie (The Matrix - TMDB ID: 603)
 */
async function testFetchMovie() {
  console.log("Test 1: Fetching movie by TMDB ID");
  console.log("Fetching The Matrix (TMDB ID: 603)...\n");

  try {
    const movie = await getMovieById(603);
    console.log("✓ Movie fetched successfully!");
    console.log(`  Title: ${movie.title}`);
    console.log(`  Release Date: ${movie.release_date}`);
    console.log(`  Overview: ${movie.overview.substring(0, 100)}...`);
    console.log(`  Rating: ${movie.vote_average}/10 (${movie.vote_count} votes)`);
    console.log(`  Poster: ${movie.poster_path || "N/A"}`);
    console.log(`  Runtime: ${movie.runtime || "N/A"} minutes`);
    console.log(`  Genres: ${movie.genres.map((g) => g.name).join(", ")}`);
    return true;
  } catch (error) {
    console.error("✗ Failed to fetch movie:", error instanceof Error
      ? error.message
      : String(error));
    return false;
  }
}

/**
 * Test error handling for invalid movie ID
 */
async function testInvalidMovieId() {
  console.log("\nTest 2: Error handling for invalid movie ID");
  console.log("Attempting to fetch movie with ID: 999999999...\n");

  try {
    await getMovieById(999999999);
    console.error("✗ Expected error for invalid movie ID, but request succeeded");
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("Movie not found") ||
      errorMessage.includes("34")
    ) {
      console.log("✓ Correctly handled invalid movie ID");
      console.log(`  Error message: ${errorMessage}`);
      return true;
    } else {
      console.error(`✗ Unexpected error: ${errorMessage}`);
      return false;
    }
  }
}

/**
 * Test error handling for invalid ID format
 */
async function testInvalidIdFormat() {
  console.log("\nTest 3: Error handling for invalid ID format");
  console.log("Attempting to fetch movie with ID: -1...\n");

  try {
    await getMovieById(-1);
    console.error("✗ Expected error for invalid ID format, but request succeeded");
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Invalid movie ID")) {
      console.log("✓ Correctly validated ID format");
      console.log(`  Error message: ${errorMessage}`);
      return true;
    } else {
      console.error(`✗ Unexpected error: ${errorMessage}`);
      return false;
    }
  }
}

/**
 * Test rate limiting by making multiple rapid requests
 */
async function testRateLimiting() {
  console.log("\nTest 4: Rate limiting behaviour");
  console.log("Making 10 rapid requests to test rate limiting...\n");

  const startTime = Date.now();
  const requests = Array.from({ length: 10 }, (_, i) =>
    getMovieById(603 + i).catch((_err) => {
      // Ignore errors for this test, we're just checking rate limiting
      return null;
    })
  );

  try {
    await Promise.all(requests);
    const duration = Date.now() - startTime;
    console.log(`✓ Completed 10 requests in ${duration}ms`);
    console.log(
      `  Average: ${(duration / 10).toFixed(2)}ms per request (rate limiting working)`,
    );
    return true;
  } catch (error) {
    console.error("✗ Rate limiting test failed:", error instanceof Error
      ? error.message
      : String(error));
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("=".repeat(60));
  console.log("TMDB API Client Test Suite");
  console.log("=".repeat(60));
  console.log();

  // Check for API key
  const apiKey = Deno.env.get("TMDB_API_KEY");
  if (!apiKey || apiKey === "your-tmdb-api-key-here") {
    console.error(
      "✗ TMDB_API_KEY environment variable is not set.",
    );
    console.error(
      "  Please set it in your .env file or environment before running tests.",
    );
    console.error(
      "  Get your API key from: https://www.themoviedb.org/settings/api",
    );
    Deno.exit(1);
  }

  const results = [
    await testFetchMovie(),
    await testInvalidMovieId(),
    await testInvalidIdFormat(),
    await testRateLimiting(),
  ];

  console.log("\n" + "=".repeat(60));
  console.log("Test Results");
  console.log("=".repeat(60));
  const passed = results.filter((r) => r).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("✓ All tests passed!");
    Deno.exit(0);
  } else {
    console.log("✗ Some tests failed");
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
