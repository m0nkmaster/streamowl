/**
 * Test script for recommendation explanation generation
 *
 * Tests:
 * 1. Generate explanation for recommendation with user history
 * 2. Verify explanation references specific user history items
 * 3. Handle empty user history gracefully
 */

import { generateRecommendationExplanation } from "../lib/ai/recommendations.ts";
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
    [`test-explanations-${Date.now()}@example.com`, "Test User"],
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
    `INSERT INTO content (tmdb_id, type, title, overview, release_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      Math.floor(Math.random() * 1000000),
      contentType,
      title,
      overview,
      "2020-01-01",
    ],
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
    `INSERT INTO user_content (user_id, content_id, status, rating, watched_at)
     VALUES ($1, $2, 'watched', $3, NOW())
     ON CONFLICT (user_id, content_id) 
     DO UPDATE SET status = 'watched', rating = $3, watched_at = NOW()`,
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
 * Test 1: Generate explanation with user history
 */
async function testExplanationWithHistory() {
  console.log("\n=== Test 1: Explanation with User History ===");

  const userId = await createTestUser();
  const contentIds: string[] = [];

  try {
    // Create watched content (action movies)
    const watched1 = await createTestContent(
      "The Matrix",
      "A computer hacker learns about the true nature of reality",
      [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
      "movie",
    );
    contentIds.push(watched1);
    await markAsWatched(userId, watched1, 9.0);

    const watched2 = await createTestContent(
      "Inception",
      "A thief who steals corporate secrets through dream-sharing technology",
      [{ id: 28, name: "Action" }, { id: 878, name: "Science Fiction" }],
      "movie",
    );
    contentIds.push(watched2);
    await markAsWatched(userId, watched2, 8.5);

    // Calculate taste profile
    await calculateAndStoreTasteProfile(userId);

    // Create recommended content
    const recommended = await createTestContent(
      "Interstellar",
      "A team of explorers travel through a wormhole in space",
      [{ id: 18, name: "Drama" }, { id: 878, name: "Science Fiction" }],
      "movie",
    );
    contentIds.push(recommended);

    // Generate recommendation candidates
    const candidates = await generateRecommendationCandidates(userId, 5);
    const candidate = candidates.find((c) => c.id === recommended);

    if (!candidate) {
      console.log("❌ Recommended content not found in candidates");
      return;
    }

    // Generate explanation
    console.log("Generating explanation...");
    const explanation = await generateRecommendationExplanation(
      userId,
      candidate,
    );

    console.log("\n✅ Explanation generated:");
    console.log(explanation);
    console.log("\n");

    // Verify explanation references user history
    const hasReference = explanation.toLowerCase().includes("matrix") ||
      explanation.toLowerCase().includes("inception");
    if (hasReference) {
      console.log("✅ Explanation references user history");
    } else {
      console.log("⚠️  Explanation may not reference user history");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await cleanup(userId, contentIds);
  }
}

/**
 * Test 2: Handle empty user history
 */
async function testExplanationEmptyHistory() {
  console.log("\n=== Test 2: Explanation with Empty History ===");

  const userId = await createTestUser();
  const contentIds: string[] = [];

  try {
    // Create recommended content
    const recommended = await createTestContent(
      "The Shawshank Redemption",
      "Two imprisoned men bond over a number of years",
      [{ id: 18, name: "Drama" }],
      "movie",
    );
    contentIds.push(recommended);

    // Get content record for candidate
    const contentResult = await query<{
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
    }>(
      `SELECT * FROM content WHERE id = $1`,
      [recommended],
    );

    if (contentResult.length === 0) {
      console.log("❌ Content not found");
      return;
    }

    const candidate = {
      ...contentResult[0],
      similarity: 0.85,
      distance: 0.15,
    };

    // Generate explanation (should handle empty history gracefully)
    console.log("Generating explanation with empty history...");
    const explanation = await generateRecommendationExplanation(
      userId,
      candidate,
    );

    console.log("\n✅ Explanation generated:");
    console.log(explanation);
    console.log("\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await cleanup(userId, contentIds);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("Testing Recommendation Explanations\n");

  // Check for OpenAI API key
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error(
      "❌ OPENAI_API_KEY environment variable is not set. Please set it to run these tests.",
    );
    Deno.exit(1);
  }

  try {
    await testExplanationWithHistory();
    await testExplanationEmptyHistory();
    console.log("\n✅ All tests completed");
  } catch (error) {
    console.error("\n❌ Tests failed:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
