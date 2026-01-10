/**
 * Test script for content embedding generation and storage
 *
 * Tests:
 * 1. Generate embedding from content text
 * 2. Verify embedding dimension matches pgvector column (1536)
 * 3. Store embedding in content table
 * 4. Verify embedding can be retrieved from database
 */

import { generateEmbedding } from "../lib/ai/openai.ts";
import {
  generateAndStoreContentEmbedding,
  generateContentText,
  generateEmbeddingFromTmdbDetails,
} from "../lib/ai/embeddings.ts";
import { getMovieDetails, getTvDetails } from "../lib/tmdb/client.ts";
import { getOrCreateContent } from "../lib/content.ts";
import { query } from "../lib/db.ts";

/**
 * Test generating embedding from text
 */
async function testGenerateEmbedding() {
  console.log("Test 1: Generate embedding from text");
  console.log("Generating embedding for sample content...\n");

  try {
    const text =
      "Title: The Matrix\n\nSynopsis: A computer hacker learns about the true nature of reality\n\nGenres: Action, Sci-Fi";
    const embedding = await generateEmbedding(text);

    console.log("✓ Embedding generated successfully!");
    console.log(`  Dimension: ${embedding.length}`);
    console.log(`  First 5 values: [${embedding.slice(0, 5).join(", ")}...]`);

    if (embedding.length !== 1536) {
      throw new Error(
        `Expected dimension 1536, got ${embedding.length}`,
      );
    }

    console.log("✓ Embedding dimension matches expected (1536)");
    return true;
  } catch (error) {
    console.error(
      "✗ Failed to generate embedding:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test generating content text from metadata
 */
function testGenerateContentText() {
  console.log("\nTest 2: Generate content text from metadata");
  console.log("Testing content text generation...\n");

  try {
    const title = "The Matrix";
    const overview =
      "A computer hacker learns about the true nature of reality";
    const genres = [
      { id: 28, name: "Action" },
      { id: 878, name: "Sci-Fi" },
    ];

    const contentText = generateContentText(title, overview, genres);

    console.log("✓ Content text generated:");
    console.log(`\n${contentText}\n`);

    if (!contentText.includes("Title: The Matrix")) {
      throw new Error("Content text missing title");
    }
    if (!contentText.includes("Synopsis: A computer hacker")) {
      throw new Error("Content text missing synopsis");
    }
    if (!contentText.includes("Genres: Action, Sci-Fi")) {
      throw new Error("Content text missing genres");
    }

    console.log("✓ Content text includes all required fields");
    return true;
  } catch (error) {
    console.error(
      "✗ Failed to generate content text:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test storing embedding in database
 */
async function testStoreEmbedding() {
  console.log("\nTest 3: Store embedding in content table");
  console.log("Fetching movie details and storing embedding...\n");

  try {
    // Fetch a known movie (The Matrix - TMDB ID: 603)
    const tmdbDetails = await getMovieDetails(603);
    console.log(`✓ Fetched movie: ${tmdbDetails.title}`);

    // Get or create content record
    const contentId = await getOrCreateContent(tmdbDetails, "movie");
    console.log(`✓ Content record ID: ${contentId}`);

    // Generate and store embedding
    const embedding = await generateAndStoreContentEmbedding(
      contentId,
      tmdbDetails.title,
      tmdbDetails.overview,
      tmdbDetails.genres,
    );

    console.log(`✓ Embedding generated and stored`);
    console.log(`  Dimension: ${embedding.length}`);

    // Verify embedding was stored
    const result = await query<{ content_embedding: number[] }>(
      "SELECT content_embedding FROM content WHERE id = $1",
      [contentId],
    );

    if (result.length === 0) {
      throw new Error("Content record not found");
    }

    const storedEmbedding = result[0].content_embedding;

    if (!storedEmbedding) {
      throw new Error("Embedding not stored in database");
    }

    if (storedEmbedding.length !== 1536) {
      throw new Error(
        `Stored embedding dimension mismatch: expected 1536, got ${storedEmbedding.length}`,
      );
    }

    console.log(`✓ Embedding retrieved from database`);
    console.log(`  Stored dimension: ${storedEmbedding.length}`);
    console.log(
      `  First 5 values: [${storedEmbedding.slice(0, 5).join(", ")}...]`,
    );

    return true;
  } catch (error) {
    console.error(
      "✗ Failed to store embedding:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test convenience function for generating embedding from TMDB details
 */
async function testGenerateEmbeddingFromTmdbDetails() {
  console.log("\nTest 4: Generate embedding from TMDB details");
  console.log("Testing convenience function...\n");

  try {
    // Fetch a TV show (Breaking Bad - TMDB ID: 1396)
    const tmdbDetails = await getTvDetails(1396);
    console.log(`✓ Fetched TV show: ${tmdbDetails.name}`);

    // Get or create content record
    const contentId = await getOrCreateContent(tmdbDetails, "tv");
    console.log(`✓ Content record ID: ${contentId}`);

    // Generate embedding using convenience function
    const embedding = await generateEmbeddingFromTmdbDetails(
      contentId,
      tmdbDetails,
      "tv",
    );

    console.log(`✓ Embedding generated and stored`);
    console.log(`  Dimension: ${embedding.length}`);

    // Verify embedding was stored
    const result = await query<{ content_embedding: number[] }>(
      "SELECT content_embedding FROM content WHERE id = $1",
      [contentId],
    );

    if (result.length === 0 || !result[0].content_embedding) {
      throw new Error("Embedding not stored in database");
    }

    const storedEmbedding = result[0].content_embedding;

    if (storedEmbedding.length !== 1536) {
      throw new Error(
        `Stored embedding dimension mismatch: expected 1536, got ${storedEmbedding.length}`,
      );
    }

    console.log(`✓ Embedding dimension verified: ${storedEmbedding.length}`);

    return true;
  } catch (error) {
    console.error(
      "✗ Failed to generate embedding from TMDB details:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("=".repeat(60));
  console.log("Content Embeddings Test Suite");
  console.log("=".repeat(60));
  console.log();

  const results = [];

  results.push(await testGenerateEmbedding());
  results.push(await testGenerateContentText());
  results.push(await testStoreEmbedding());
  results.push(await testGenerateEmbeddingFromTmdbDetails());

  console.log("\n" + "=".repeat(60));
  console.log("Test Results Summary");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log(`\nPassed: ${passed}/${total}`);

  if (passed === total) {
    console.log("✓ All tests passed!");
    Deno.exit(0);
  } else {
    console.error("✗ Some tests failed");
    Deno.exit(1);
  }
}

// Run tests if script is executed directly
if (import.meta.main) {
  await runTests();
}
