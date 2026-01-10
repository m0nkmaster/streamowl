/**
 * Test script for TMDB watch providers functionality
 *
 * Tests:
 * 1. Fetching watch providers for a popular movie (Inception - ID 27205)
 * 2. Verify subscription, rent, and buy options are correctly categorised
 * 3. Test filtering by different regions (US, UK, CA, AU, DE, FR)
 * 4. Test fetching watch providers for a TV show (Breaking Bad - ID 1396)
 * 5. Verify error handling for invalid IDs
 */

import {
  getMovieWatchProvidersByRegion,
  getTvWatchProvidersByRegion,
  SUPPORTED_REGIONS,
  type SupportedRegion,
} from "../lib/tmdb/client.ts";

/**
 * Test fetching watch providers for Inception (TMDB ID: 27205) in US region
 */
async function testMovieWatchProviders() {
  console.log(
    "Test 1: Fetching watch providers for Inception (ID: 27205) in US region",
  );
  console.log("Fetching providers...\n");

  try {
    const providers = await getMovieWatchProvidersByRegion(27205, "US");

    if (!providers) {
      console.warn(
        "⚠ No watch providers available for this movie in US region",
      );
      return true; // Not a failure, just no data
    }

    console.log("✓ Watch providers fetched successfully!");
    console.log(`  Region: ${providers.region}`);
    console.log(`  Link: ${providers.link || "N/A"}`);
    console.log(
      `  Subscription services: ${providers.subscription.length}`,
    );
    console.log(`  Rent options: ${providers.rent.length}`);
    console.log(`  Buy options: ${providers.buy.length}`);
    console.log(`  Ad-supported: ${providers.ads.length}`);
    console.log(`  Free services: ${providers.free.length}`);

    // Verify subscription services structure
    if (providers.subscription.length > 0) {
      const firstSub = providers.subscription[0];
      if (!firstSub.provider_name || !firstSub.provider_id) {
        console.error("✗ Subscription provider structure is invalid");
        console.error(
          `  Expected: { provider_name, provider_id, logo_path, ... }`,
        );
        console.error(`  Got: ${JSON.stringify(firstSub, null, 2)}`);
        return false;
      }
      console.log(
        `\n  ✓ First subscription service: ${firstSub.provider_name} (ID: ${firstSub.provider_id})`,
      );
    }

    // Verify rent options structure
    if (providers.rent.length > 0) {
      const firstRent = providers.rent[0];
      if (!firstRent.provider_name || !firstRent.provider_id) {
        console.error("✗ Rent provider structure is invalid");
        return false;
      }
      console.log(
        `  ✓ First rent option: ${firstRent.provider_name} (ID: ${firstRent.provider_id})`,
      );
    }

    // Verify buy options structure
    if (providers.buy.length > 0) {
      const firstBuy = providers.buy[0];
      if (!firstBuy.provider_name || !firstBuy.provider_id) {
        console.error("✗ Buy provider structure is invalid");
        return false;
      }
      console.log(
        `  ✓ First buy option: ${firstBuy.provider_name} (ID: ${firstBuy.provider_id})`,
      );
    }

    // Verify at least one category has providers (common for popular movies)
    const totalProviders = providers.subscription.length +
      providers.rent.length +
      providers.buy.length +
      providers.ads.length +
      providers.free.length;

    if (totalProviders === 0) {
      console.warn(
        "  ⚠ No providers found in any category (may be normal for some content)",
      );
    } else {
      console.log(`\n  ✓ Total providers found: ${totalProviders}`);
    }

    return true;
  } catch (error) {
    console.error(
      "✗ Watch providers fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test filtering by different regions
 */
async function testRegionFiltering() {
  console.log("\nTest 2: Testing region filtering");
  console.log("Testing multiple regions...\n");

  const movieId = 27205; // Inception
  const results: Record<string, boolean> = {};

  for (const region of SUPPORTED_REGIONS) {
    try {
      const providers = await getMovieWatchProvidersByRegion(
        movieId,
        region as SupportedRegion,
      );
      if (providers) {
        const totalProviders = providers.subscription.length +
          providers.rent.length +
          providers.buy.length +
          providers.ads.length +
          providers.free.length;
        console.log(
          `  ✓ ${region}: ${totalProviders} providers found`,
        );
        results[region] = true;
      } else {
        console.log(`  ⚠ ${region}: No providers available`);
        results[region] = true; // Not a failure, just no data
      }
    } catch (error) {
      console.error(
        `  ✗ ${region}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      results[region] = false;
    }
  }

  const allPassed = Object.values(results).every((r) => r);
  return allPassed;
}

/**
 * Test fetching watch providers for a TV show
 */
async function testTvWatchProviders() {
  console.log(
    "\nTest 3: Fetching watch providers for Breaking Bad (ID: 1396) in US region",
  );
  console.log("Fetching providers...\n");

  try {
    const providers = await getTvWatchProvidersByRegion(1396, "US");

    if (!providers) {
      console.warn(
        "⚠ No watch providers available for this TV show in US region",
      );
      return true; // Not a failure, just no data
    }

    console.log("✓ Watch providers fetched successfully!");
    console.log(`  Region: ${providers.region}`);
    console.log(`  Subscription services: ${providers.subscription.length}`);
    console.log(`  Rent options: ${providers.rent.length}`);
    console.log(`  Buy options: ${providers.buy.length}`);

    // Verify categorisation
    const hasSubscription = providers.subscription.length > 0;
    const hasRent = providers.rent.length > 0;
    const hasBuy = providers.buy.length > 0;

    if (hasSubscription || hasRent || hasBuy) {
      console.log("\n  ✓ Providers correctly categorised:");
      if (hasSubscription) {
        console.log(
          `    - Subscription: ${
            providers.subscription.map((p) => p.provider_name).join(", ")
          }`,
        );
      }
      if (hasRent) {
        console.log(
          `    - Rent: ${
            providers.rent.map((p) => p.provider_name).join(", ")
          }`,
        );
      }
      if (hasBuy) {
        console.log(
          `    - Buy: ${providers.buy.map((p) => p.provider_name).join(", ")}`,
        );
      }
    }

    return true;
  } catch (error) {
    console.error(
      "✗ TV watch providers fetch failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Test error handling for invalid movie ID
 */
async function testInvalidMovieId() {
  console.log("\nTest 4: Error handling for invalid movie ID");
  console.log("Testing invalid ID (0)...\n");

  try {
    await getMovieWatchProvidersByRegion(0, "US");
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
  console.log("\nTest 5: Error handling for invalid TV ID");
  console.log("Testing invalid ID (-1)...\n");

  try {
    await getTvWatchProvidersByRegion(-1, "US");
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
 * Test categorisation of subscription, rent, and buy options
 */
async function testCategorisation() {
  console.log(
    "\nTest 6: Verifying subscription, rent, and buy categorisation",
  );
  console.log("Testing with popular movie (The Matrix - ID: 603)...\n");

  try {
    const providers = await getMovieWatchProvidersByRegion(603, "US");

    if (!providers) {
      console.warn("⚠ No providers available for this movie");
      return true; // Not a failure
    }

    console.log("✓ Providers fetched and categorised:");
    console.log(
      `  Subscription (flatrate): ${providers.subscription.length} providers`,
    );
    console.log(`  Rent: ${providers.rent.length} providers`);
    console.log(`  Buy: ${providers.buy.length} providers`);

    // Verify each category has correct structure
    const allCategories = [
      { name: "subscription", providers: providers.subscription },
      { name: "rent", providers: providers.rent },
      { name: "buy", providers: providers.buy },
    ];

    for (const category of allCategories) {
      for (const provider of category.providers) {
        if (
          !provider.provider_name ||
          !provider.provider_id ||
          typeof provider.provider_id !== "number"
        ) {
          console.error(
            `✗ Invalid provider structure in ${category.name} category`,
          );
          return false;
        }
      }
    }

    console.log("  ✓ All providers correctly structured");
    return true;
  } catch (error) {
    console.error(
      "✗ Categorisation test failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("=".repeat(60));
  console.log("TMDB Watch Providers Test Suite");
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
    await testMovieWatchProviders(),
    await testRegionFiltering(),
    await testTvWatchProviders(),
    await testInvalidMovieId(),
    await testInvalidTvId(),
    await testCategorisation(),
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
