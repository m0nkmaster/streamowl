/**
 * Test script for TMDB content details functionality
 *
 * Tests:
 * 1. Fetching movie details for a known movie ID (Inception - ID 27205)
 * 2. Verify cast, crew, poster, and backdrop data is returned
 * 3. Fetching TV show details for a known TV ID (Breaking Bad - ID 1396)
 * 4. Verify TV details include credits and images
 */

import { getMovieDetails, getTvDetails } from "../lib/tmdb/client.ts";

/**
 * Test fetching movie details for Inception (TMDB ID: 27205)
 */
async function testMovieDetails() {
  console.log("Test 1: Fetching movie details for Inception (ID: 27205)");
  console.log("Fetching details...\n");

  try {
    const details = await getMovieDetails(27205);

    console.log("✓ Movie details fetched successfully!");
    console.log(`  Title: ${details.title}`);
    console.log(`  Release Date: ${details.release_date}`);
    console.log(`  Runtime: ${details.runtime} minutes`);
    console.log(
      `  Rating: ${details.vote_average}/10 (${details.vote_count} votes)`,
    );
    console.log(`  Genres: ${details.genres.map((g) => g.name).join(", ")}`);
    console.log(`  Poster: ${details.poster_path || "N/A"}`);
    console.log(`  Backdrop: ${details.backdrop_path || "N/A"}`);

    // Verify credits are included
    if (!details.credits) {
      console.error("✗ Credits not included in response");
      return false;
    }

    console.log("\n  ✓ Credits included:");
    console.log(`    Cast members: ${details.credits.cast.length}`);
    console.log(`    Crew members: ${details.credits.crew.length}`);

    // Verify cast data structure
    if (details.credits.cast.length === 0) {
      console.warn("  ⚠ No cast members returned");
    } else {
      const firstCast = details.credits.cast[0];
      if (!firstCast.name || !firstCast.character) {
        console.error("✗ Cast member structure is invalid");
        console.error(`  Expected: { name, character, ... }`);
        console.error(`  Got: ${JSON.stringify(firstCast, null, 2)}`);
        return false;
      }
      console.log(
        `    First cast member: ${firstCast.name} as ${firstCast.character}`,
      );
    }

    // Verify crew data structure
    if (details.credits.crew.length === 0) {
      console.warn("  ⚠ No crew members returned");
    } else {
      const firstCrew = details.credits.crew[0];
      if (!firstCrew.name || !firstCrew.job) {
        console.error("✗ Crew member structure is invalid");
        console.error(`  Expected: { name, job, department, ... }`);
        console.error(`  Got: ${JSON.stringify(firstCrew, null, 2)}`);
        return false;
      }
      console.log(
        `    First crew member: ${firstCrew.name} - ${firstCrew.job} (${firstCrew.department})`,
      );
    }

    // Verify images are included
    if (!details.images) {
      console.error("✗ Images not included in response");
      return false;
    }

    console.log("\n  ✓ Images included:");
    console.log(`    Posters: ${details.images.posters.length}`);
    console.log(`    Backdrops: ${details.images.backdrops.length}`);

    // Verify poster data structure
    if (details.images.posters.length === 0) {
      console.warn("  ⚠ No posters returned");
    } else {
      const firstPoster = details.images.posters[0];
      if (!firstPoster.file_path) {
        console.error("✗ Poster structure is invalid");
        console.error(`  Expected: { file_path, width, height, ... }`);
        console.error(`  Got: ${JSON.stringify(firstPoster, null, 2)}`);
        return false;
      }
      console.log(
        `    First poster: ${firstPoster.file_path} (${firstPoster.width}x${firstPoster.height})`,
      );
    }

    // Verify backdrop data structure
    if (details.images.backdrops.length === 0) {
      console.warn("  ⚠ No backdrops returned");
    } else {
      const firstBackdrop = details.images.backdrops[0];
      if (!firstBackdrop.file_path) {
        console.error("✗ Backdrop structure is invalid");
        console.error(`  Expected: { file_path, width, height, ... }`);
        console.error(`  Got: ${JSON.stringify(firstBackdrop, null, 2)}`);
        return false;
      }
      console.log(
        `    First backdrop: ${firstBackdrop.file_path} (${firstBackdrop.width}x${firstBackdrop.height})`,
      );
    }

    return true;
  } catch (error) {
    console.error(
      "✗ Movie details fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test fetching TV show details for Breaking Bad (TMDB ID: 1396)
 */
async function testTvDetails() {
  console.log("\nTest 2: Fetching TV show details for Breaking Bad (ID: 1396)");
  console.log("Fetching details...\n");

  try {
    const details = await getTvDetails(1396);

    console.log("✓ TV show details fetched successfully!");
    console.log(`  Title: ${details.name}`);
    console.log(`  First Air Date: ${details.first_air_date}`);
    console.log(
      `  Episode Runtime: ${details.episode_run_time.join(", ")} minutes`,
    );
    console.log(
      `  Rating: ${details.vote_average}/10 (${details.vote_count} votes)`,
    );
    console.log(`  Genres: ${details.genres.map((g) => g.name).join(", ")}`);
    console.log(`  Poster: ${details.poster_path || "N/A"}`);
    console.log(`  Backdrop: ${details.backdrop_path || "N/A"}`);

    // Verify credits are included
    if (!details.credits) {
      console.error("✗ Credits not included in response");
      return false;
    }

    console.log("\n  ✓ Credits included:");
    console.log(`    Cast members: ${details.credits.cast.length}`);
    console.log(`    Crew members: ${details.credits.crew.length}`);

    // Verify cast data structure
    if (details.credits.cast.length === 0) {
      console.warn("  ⚠ No cast members returned");
    } else {
      const firstCast = details.credits.cast[0];
      if (!firstCast.name || !firstCast.character) {
        console.error("✗ Cast member structure is invalid");
        return false;
      }
      console.log(
        `    First cast member: ${firstCast.name} as ${firstCast.character}`,
      );
    }

    // Verify images are included
    if (!details.images) {
      console.error("✗ Images not included in response");
      return false;
    }

    console.log("\n  ✓ Images included:");
    console.log(`    Posters: ${details.images.posters.length}`);
    console.log(`    Backdrops: ${details.images.backdrops.length}`);

    return true;
  } catch (error) {
    console.error(
      "✗ TV show details fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test error handling for invalid movie ID
 */
async function testInvalidMovieId() {
  console.log("\nTest 3: Error handling for invalid movie ID");
  console.log("Testing invalid ID (0)...\n");

  try {
    await getMovieDetails(0);
    console.error(
      "✗ Expected error for invalid movie ID, but request succeeded",
    );
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Invalid movie ID")) {
      console.log("✓ Correctly rejected invalid movie ID");
      console.log(`  Error message: ${errorMessage}`);
      return true;
    } else {
      console.error(`✗ Unexpected error: ${errorMessage}`);
      return false;
    }
  }
}

/**
 * Test error handling for invalid TV ID
 */
async function testInvalidTvId() {
  console.log("\nTest 4: Error handling for invalid TV ID");
  console.log("Testing invalid ID (-1)...\n");

  try {
    await getTvDetails(-1);
    console.error("✗ Expected error for invalid TV ID, but request succeeded");
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Invalid TV show ID")) {
      console.log("✓ Correctly rejected invalid TV ID");
      console.log(`  Error message: ${errorMessage}`);
      return true;
    } else {
      console.error(`✗ Unexpected error: ${errorMessage}`);
      return false;
    }
  }
}

/**
 * Test error handling for non-existent movie ID
 */
async function testNonExistentMovieId() {
  console.log("\nTest 5: Error handling for non-existent movie ID");
  console.log("Testing non-existent ID (999999999)...\n");

  try {
    await getMovieDetails(999999999);
    console.error(
      "✗ Expected error for non-existent movie ID, but request succeeded",
    );
    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      console.log("✓ Correctly handled non-existent movie ID");
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
  console.log("TMDB Content Details Test Suite");
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
    await testMovieDetails(),
    await testTvDetails(),
    await testInvalidMovieId(),
    await testInvalidTvId(),
    await testNonExistentMovieId(),
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
