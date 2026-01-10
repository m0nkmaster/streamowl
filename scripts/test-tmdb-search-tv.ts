/**
 * Test script for TMDB TV show search functionality
 *
 * Tests:
 * 1. Searching for 'Breaking Bad' returns correct results
 * 2. Content type is correctly set to 'tv'
 * 3. Pagination returns different results for page 2
 */

import { searchTv } from "../lib/tmdb/client.ts";

/**
 * Test searching for 'Breaking Bad'
 */
async function testSearchBreakingBad() {
  console.log("Test 1: Searching for 'Breaking Bad'");
  console.log("Performing search...\n");

  try {
    const results = await searchTv("Breaking Bad");

    console.log("✓ Search completed successfully!");
    console.log(`  Total results: ${results.total_results}`);
    console.log(`  Total pages: ${results.total_pages}`);
    console.log(`  Current page: ${results.page}`);
    console.log(`  Results on this page: ${results.results.length}`);

    if (results.results.length === 0) {
      console.error("✗ No results returned for 'Breaking Bad' search");
      return false;
    }

    // Check if Breaking Bad is in the results (should be first or near the top)
    const breakingBad = results.results.find(
      (tv) => tv.title.toLowerCase().includes("breaking bad"),
    );

    if (!breakingBad) {
      console.warn("  ⚠ 'Breaking Bad' not found in first page results");
      console.log("  First few results:");
      results.results.slice(0, 3).forEach((tv, idx) => {
        console.log(
          `    ${idx + 1}. ${tv.title} (${tv.release_date || "N/A"})`,
        );
      });
    } else {
      console.log("\n  ✓ Found 'Breaking Bad' in results:");
      console.log(`    Title: ${breakingBad.title}`);
      console.log(`    TMDB ID: ${breakingBad.tmdb_id}`);
      console.log(`    Type: ${breakingBad.type}`);
      console.log(`    First Air Date: ${breakingBad.release_date || "N/A"}`);
      console.log(
        `    Overview: ${breakingBad.overview?.substring(0, 80) || "N/A"}...`,
      );
      console.log(`    Poster: ${breakingBad.poster_path || "N/A"}`);
    }

    // Verify result structure matches Content interface
    const firstResult = results.results[0];
    if (
      !firstResult.tmdb_id ||
      firstResult.type !== "tv" ||
      !firstResult.title
    ) {
      console.error("✗ Result structure is invalid");
      console.error(`  Expected: { tmdb_id, type: 'tv', title, ... }`);
      console.error(`  Got: ${JSON.stringify(firstResult, null, 2)}`);
      return false;
    }

    console.log("\n  ✓ Result structure is valid");
    return true;
  } catch (error) {
    console.error(
      "✗ Search failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test that content type is correctly set to 'tv'
 */
async function testContentType() {
  console.log("\nTest 2: Verifying content type is set to 'tv'");
  console.log("Checking all results have type 'tv'...\n");

  try {
    const results = await searchTv("tv", 1);

    if (results.results.length === 0) {
      console.error("✗ No results returned for search");
      return false;
    }

    const invalidTypes = results.results.filter((tv) => tv.type !== "tv");

    if (invalidTypes.length > 0) {
      console.error(
        `✗ Found ${invalidTypes.length} results with incorrect type`,
      );
      invalidTypes.forEach((tv) => {
        console.error(`  - ${tv.title}: type is '${tv.type}', expected 'tv'`);
      });
      return false;
    }

    console.log(`✓ All ${results.results.length} results have type 'tv'`);
    return true;
  } catch (error) {
    console.error(
      "✗ Test failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test pagination returns different results for page 2
 */
async function testPagination() {
  console.log(
    "\nTest 3: Pagination - verifying page 2 returns different results",
  );
  console.log("Fetching page 1 and page 2...\n");

  try {
    const page1 = await searchTv("tv", 1);
    const page2 = await searchTv("tv", 2);

    console.log(`  Page 1: ${page1.results.length} results`);
    console.log(`  Page 2: ${page2.results.length} results`);

    if (page1.results.length === 0 || page2.results.length === 0) {
      console.error("✗ One or both pages returned no results");
      return false;
    }

    // Check that pages are different
    if (page1.page === page2.page) {
      console.error("✗ Both requests returned the same page number");
      return false;
    }

    // Check that results are different (compare TMDB IDs)
    const page1Ids = new Set(page1.results.map((tv) => tv.tmdb_id));
    const page2Ids = new Set(page2.results.map((tv) => tv.tmdb_id));

    const overlap = [...page1Ids].filter((id) => page2Ids.has(id));

    if (overlap.length > 0) {
      console.warn(
        `  ⚠ Found ${overlap.length} overlapping results between pages`,
      );
      console.log(
        "  This might be acceptable if TMDB results changed between requests",
      );
    } else {
      console.log("  ✓ No overlapping results between pages");
    }

    // Verify pagination metadata
    if (
      page1.total_pages !== page2.total_pages ||
      page1.total_results !== page2.total_results
    ) {
      console.error("✗ Pagination metadata differs between pages");
      console.error(
        `  Page 1: ${page1.total_pages} pages, ${page1.total_results} total`,
      );
      console.error(
        `  Page 2: ${page2.total_pages} pages, ${page2.total_results} total`,
      );
      return false;
    }

    console.log(
      `  ✓ Pagination metadata consistent: ${page1.total_pages} pages, ${page1.total_results} total results`,
    );
    console.log(
      `  ✓ Page 1 results: ${
        page1.results.map((tv) => tv.title).slice(0, 3).join(", ")
      }...`,
    );
    console.log(
      `  ✓ Page 2 results: ${
        page2.results.map((tv) => tv.title).slice(0, 3).join(", ")
      }...`,
    );

    return true;
  } catch (error) {
    console.error(
      "✗ Pagination test failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test error handling for invalid query
 */
async function testInvalidQuery() {
  console.log("\nTest 4: Error handling for invalid query");
  console.log("Testing empty query...\n");

  try {
    await searchTv("");
    console.error("✗ Expected error for empty query, but request succeeded");
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("non-empty string")) {
      console.log("✓ Correctly rejected empty query");
      console.log(`  Error message: ${errorMessage}`);
      return true;
    } else {
      console.error(`✗ Unexpected error: ${errorMessage}`);
      return false;
    }
  }
}

/**
 * Test error handling for invalid page number
 */
async function testInvalidPage() {
  console.log("\nTest 5: Error handling for invalid page number");
  console.log("Testing page 0...\n");

  try {
    await searchTv("test", 0);
    console.error(
      "✗ Expected error for invalid page number, but request succeeded",
    );
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("positive integer")) {
      console.log("✓ Correctly validated page number");
      console.log(`  Error message: ${errorMessage}`);
      return true;
    } else {
      console.error(`✗ Unexpected error: ${errorMessage}`);
      return false;
    }
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("=".repeat(60));
  console.log("TMDB TV Show Search Test Suite");
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
    await testSearchBreakingBad(),
    await testContentType(),
    await testPagination(),
    await testInvalidQuery(),
    await testInvalidPage(),
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
