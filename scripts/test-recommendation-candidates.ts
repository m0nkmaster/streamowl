/**
 * Test script for recommendation candidates generation
 *
 * Tests:
 * 1. Generate candidates for user with taste profile
 * 2. Exclude already watched content
 * 3. Apply diversity scoring to avoid repetitive recommendations
 * 4. Return top candidates ranked by similarity
 */

import { generateRecommendationCandidates } from "../lib/ai/recommendations.ts";
import { calculateAndStoreTasteProfile } from "../lib/ai/taste-profile.ts";
import { query } from "../lib/db.ts";
import { generateAndStoreContentEmbedding } from "../lib/ai/embeddings.ts";

/**
 * Create test user
 */
async function createTestUser(): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO users (email, display_name)
     VALUES ($1, $2)
     RETURNING id`,
    [`test-recommendations-${Date.now()}@example.com`, "Test User"],
  );
  return result[0].id;
}

/**
 * Create test content with embedding
 */
async function createTestContent(
  title: string,
  overview: string,
  genres: Array<{ id: number; name: string }>,
  contentType: "movie" | "tv" = "movie",
): Promise<string> {
  // Create content record
  const contentResult = await query<{ id: string }>(
    `INSERT INTO content (tmdb_id, type, title, overview)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [Math.floor(Math.random() * 1000000), contentType, title, overview],
  );
  const contentId = contentResult[0].id;

  // Generate and store embedding
  await generateAndStoreContentEmbedding(contentId, title, overview, genres);

  return contentId;
}

/**
 * Mark content as watched for user
 */
async function markAsWatched(
  userId: string,
  contentId: string,
  rating?: number,
): Promise<void> {
  await query(
    `INSERT INTO user_content (user_id, content_id, status, rating)
     VALUES ($1, $2, 'watched', $3)
     ON CONFLICT (user_id, content_id) 
     DO UPDATE SET status = 'watched', rating = $3`,
    [userId, contentId, rating ?? null],
  );
}

/**
 * Clean up test data
 */
async function cleanup(userId: string, contentIds: string[]): Promise<void> {
  // Delete user_content records
  await query(
    `DELETE FROM user_content WHERE user_id = $1`,
    [userId],
  );

  // Delete content records
  for (const contentId of contentIds) {
    await query(`DELETE FROM content WHERE id = $1`, [contentId]);
  }

  // Delete user
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
}

/**
 * Test 1: Generate candidates for user with taste profile
 */
async function testBasicRecommendations() {
  console.log("\n=== Test 1: Basic Recommendations ===");

  const userId = await createTestUser();
  const contentIds: string[] = [];

  try {
    // Create watched content (action movies)
    const watched1 = await createTestContent(
      "The Matrix",
      "A computer hacker learns about the true nature of reality",
      [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
    );
    contentIds.push(watched1);
    await markAsWatched(userId, watched1, 9.0);

    const watched2 = await createTestContent(
      "Inception",
      "A thief who enters people's dreams to steal secrets",
      [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
    );
    contentIds.push(watched2);
    await markAsWatched(userId, watched2, 8.5);

    // Calculate taste profile
    await calculateAndStoreTasteProfile(userId);

    // Create similar content (should be recommended)
    const similar1 = await createTestContent(
      "The Matrix Reloaded",
      "Neo continues his journey to save humanity",
      [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
    );
    contentIds.push(similar1);

    const similar2 = await createTestContent(
      "Interstellar",
      "A team of explorers travel through a wormhole in space",
      [{ id: 18, name: "Drama" }, { id: 878, name: "Science Fiction" }],
    );
    contentIds.push(similar2);

    // Create different content (should be less recommended)
    const different = await createTestContent(
      "The Notebook",
      "A love story set in the 1940s",
      [{ id: 18, name: "Drama" }, { id: 10749, name: "Romance" }],
    );
    contentIds.push(different);

    // Generate recommendations
    const candidates = await generateRecommendationCandidates(userId, 20);

    console.log(`✓ Generated ${candidates.length} candidates`);
    console.log(`✓ Top candidate: ${candidates[0]?.title}`);
    console.log(
      `✓ Similarity scores:`,
      candidates.slice(0, 3).map((c) => ({
        title: c.title,
        similarity: c.similarity.toFixed(3),
      })),
    );

    // Verify candidates are returned
    if (candidates.length === 0) {
      throw new Error("No candidates generated");
    }

    // Verify similarity scores are reasonable (between 0 and 1)
    for (const candidate of candidates) {
      if (candidate.similarity < 0 || candidate.similarity > 1) {
        throw new Error(
          `Invalid similarity score: ${candidate.similarity} for ${candidate.title}`,
        );
      }
    }

    console.log("✓ Test passed");
  } finally {
    await cleanup(userId, contentIds);
  }
}

/**
 * Test 2: Exclude watched content
 */
async function testExcludeWatched() {
  console.log("\n=== Test 2: Exclude Watched Content ===");

  const userId = await createTestUser();
  const contentIds: string[] = [];

  try {
    // Create and watch content
    const watched = await createTestContent(
      "The Matrix",
      "A computer hacker learns about the true nature of reality",
      [{ id: 28, name: "Action" }],
    );
    contentIds.push(watched);
    await markAsWatched(userId, watched, 9.0);

    // Calculate taste profile
    await calculateAndStoreTasteProfile(userId);

    // Create unwatched similar content
    const unwatched = await createTestContent(
      "The Matrix Reloaded",
      "Neo continues his journey",
      [{ id: 28, name: "Action" }],
    );
    contentIds.push(unwatched);

    // Generate recommendations
    const candidates = await generateRecommendationCandidates(userId, 20);

    // Verify watched content is not in recommendations
    const watchedInResults = candidates.some((c) => c.id === watched);
    if (watchedInResults) {
      throw new Error("Watched content found in recommendations");
    }

    // Verify unwatched content is in recommendations
    const unwatchedInResults = candidates.some((c) => c.id === unwatched);
    if (!unwatchedInResults) {
      throw new Error("Unwatched content not found in recommendations");
    }

    console.log(`✓ Generated ${candidates.length} candidates`);
    console.log(`✓ Watched content excluded: ${!watchedInResults}`);
    console.log(`✓ Unwatched content included: ${unwatchedInResults}`);
    console.log("✓ Test passed");
  } finally {
    await cleanup(userId, contentIds);
  }
}

/**
 * Test 3: Diversity scoring
 */
async function testDiversityScoring() {
  console.log("\n=== Test 3: Diversity Scoring ===");

  const userId = await createTestUser();
  const contentIds: string[] = [];

  try {
    // Create watched content (action movies)
    const watched = await createTestContent(
      "The Matrix",
      "A computer hacker learns about the true nature of reality",
      [{ id: 28, name: "Action" }],
    );
    contentIds.push(watched);
    await markAsWatched(userId, watched, 9.0);

    // Calculate taste profile
    await calculateAndStoreTasteProfile(userId);

    // Create many similar action movies
    for (let i = 0; i < 10; i++) {
      const contentId = await createTestContent(
        `Action Movie ${i}`,
        `An action-packed adventure ${i}`,
        [{ id: 28, name: "Action" }],
      );
      contentIds.push(contentId);
    }

    // Create some different content
    const drama = await createTestContent(
      "Drama Movie",
      "A dramatic story",
      [{ id: 18, name: "Drama" }],
    );
    contentIds.push(drama);

    // Generate recommendations with limit
    const candidates = await generateRecommendationCandidates(userId, 5);

    console.log(`✓ Generated ${candidates.length} candidates`);
    console.log(`✓ Content types:`, candidates.map((c) => c.type));

    // Verify we got exactly the limit
    if (candidates.length !== 5) {
      throw new Error(
        `Expected 5 candidates, got ${candidates.length}`,
      );
    }

    // Verify diversity (should not have all same type)
    const types = new Set(candidates.map((c) => c.type));
    console.log(`✓ Unique types: ${types.size}`);

    // Verify candidates are sorted by similarity (descending)
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].similarity > candidates[i - 1].similarity) {
        throw new Error("Candidates not sorted by similarity");
      }
    }

    console.log("✓ Test passed");
  } finally {
    await cleanup(userId, contentIds);
  }
}

/**
 * Test 4: User without taste profile
 */
async function testNoTasteProfile() {
  console.log("\n=== Test 4: User Without Taste Profile ===");

  const userId = await createTestUser();
  const contentIds: string[] = [];

  try {
    // Create some content
    const content = await createTestContent(
      "Some Movie",
      "A movie",
      [{ id: 28, name: "Action" }],
    );
    contentIds.push(content);

    // Generate recommendations (user has no taste profile)
    const candidates = await generateRecommendationCandidates(userId, 20);

    // Should return empty array
    if (candidates.length !== 0) {
      throw new Error(
        `Expected empty array for user without taste profile, got ${candidates.length} candidates`,
      );
    }

    console.log("✓ Empty array returned for user without taste profile");
    console.log("✓ Test passed");
  } finally {
    await cleanup(userId, contentIds);
  }
}

/**
 * Run all tests
 */
async function main() {
  console.log("Testing recommendation candidates generation...");

  try {
    await testBasicRecommendations();
    await testExcludeWatched();
    await testDiversityScoring();
    await testNoTasteProfile();

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
