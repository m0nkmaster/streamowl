#!/usr/bin/env -S deno run -A

/**
 * Test script for content table migration
 *
 * Tests:
 * 1. Verify table exists with correct columns
 * 2. Verify content_type enum exists
 * 3. Test inserting a sample movie record
 * 4. Test inserting a sample TV show record
 * 5. Test retrieving content records
 */

import { closePool, query } from "../lib/db.ts";

interface Content {
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
}

async function verifyEnumType() {
  console.log("Verifying content_type enum...");

  try {
    const result = await query<{
      typname: string;
      enumlabel: string;
    }>(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'content_type'
      ORDER BY e.enumsortorder
    `);

    const expectedValues = ["movie", "tv", "documentary"];
    const foundValues = result.map((r) => r.enumlabel);

    console.log(`Found enum values: ${foundValues.join(", ")}`);

    const missingValues = expectedValues.filter(
      (ev) => !foundValues.includes(ev),
    );

    if (missingValues.length > 0) {
      throw new Error(
        `Missing enum values: ${missingValues.join(", ")}`,
      );
    }

    console.log("✓ content_type enum verified");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Enum verification failed:", message);
    throw error;
  }
}

async function verifyTableStructure() {
  console.log("\nVerifying content table structure...");

  try {
    // Check if table exists and get column information
    const result = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      udt_name: string;
    }>(`
      SELECT column_name, data_type, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_name = 'content'
      ORDER BY ordinal_position
    `);

    const expectedColumns = [
      { name: "id", type: "uuid" },
      { name: "tmdb_id", type: "integer" },
      { name: "type", type: "USER-DEFINED" }, // enum type
      { name: "title", type: "character varying" },
      { name: "overview", type: "text" },
      { name: "release_date", type: "date" },
      { name: "poster_path", type: "text" },
      { name: "backdrop_path", type: "text" },
      { name: "metadata", type: "jsonb" },
      { name: "created_at", type: "timestamp with time zone" },
      { name: "updated_at", type: "timestamp with time zone" },
    ];

    console.log(`Found ${result.length} columns in content table:`);
    result.forEach((col) => {
      const typeDisplay = col.udt_name === "content_type"
        ? `content_type (enum)`
        : col.data_type;
      console.log(`  - ${col.column_name} (${typeDisplay})`);
    });

    // Verify all expected columns exist
    const foundColumns = new Set(result.map((r) => r.column_name));
    const missingColumns = expectedColumns.filter(
      (ec) => !foundColumns.has(ec.name),
    );

    if (missingColumns.length > 0) {
      throw new Error(
        `Missing columns: ${missingColumns.map((c) => c.name).join(", ")}`,
      );
    }

    // Verify type column is enum
    const typeColumn = result.find((r) => r.column_name === "type");
    if (!typeColumn || typeColumn.udt_name !== "content_type") {
      throw new Error(
        `Type column should be content_type enum, got ${typeColumn?.udt_name}`,
      );
    }

    console.log("✓ Table structure verified");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Table structure verification failed:", message);
    throw error;
  }
}

async function testInsertMovie() {
  console.log("\nTesting movie insertion...");

  try {
    const testMovie = {
      tmdb_id: 550,
      type: "movie" as const,
      title: "Fight Club",
      overview:
        "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
      release_date: "1999-10-15",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      backdrop_path: "/87hTDiay2N2qWyX4am7F2G2f1Qr.jpg",
      metadata: {
        runtime: 139,
        budget: 63000000,
        revenue: 100853753,
      },
    };

    const result = await query<Content>(
      `
      INSERT INTO content (tmdb_id, type, title, overview, release_date, poster_path, backdrop_path, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        testMovie.tmdb_id,
        testMovie.type,
        testMovie.title,
        testMovie.overview,
        testMovie.release_date,
        testMovie.poster_path,
        testMovie.backdrop_path,
        JSON.stringify(testMovie.metadata),
      ],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 inserted row, got " + result.length);
    }

    const content = result[0];
    console.log("✓ Movie inserted successfully:");
    console.log(`  ID: ${content.id}`);
    console.log(`  TMDB ID: ${content.tmdb_id}`);
    console.log(`  Type: ${content.type}`);
    console.log(`  Title: ${content.title}`);
    console.log(`  Release Date: ${content.release_date}`);
    console.log(`  Metadata: ${JSON.stringify(content.metadata)}`);

    // Verify fields
    if (content.tmdb_id !== testMovie.tmdb_id) {
      throw new Error(
        `TMDB ID mismatch: expected ${testMovie.tmdb_id}, got ${content.tmdb_id}`,
      );
    }
    if (content.type !== testMovie.type) {
      throw new Error(
        `Type mismatch: expected ${testMovie.type}, got ${content.type}`,
      );
    }
    if (content.title !== testMovie.title) {
      throw new Error(
        `Title mismatch: expected ${testMovie.title}, got ${content.title}`,
      );
    }
    if (!content.id || typeof content.id !== "string") {
      throw new Error("ID is not a valid UUID string");
    }

    return content.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Movie insertion test failed:", message);
    throw error;
  }
}

async function testInsertTvShow() {
  console.log("\nTesting TV show insertion...");

  try {
    const testTvShow = {
      tmdb_id: 1396,
      type: "tv" as const,
      title: "Breaking Bad",
      overview:
        "A high school chemistry teacher turned methamphetamine manufacturer partners with a former student.",
      release_date: "2008-01-20",
      poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
      backdrop_path: "/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
      metadata: {
        number_of_seasons: 5,
        number_of_episodes: 62,
        first_air_date: "2008-01-20",
        last_air_date: "2013-09-29",
      },
    };

    const result = await query<Content>(
      `
      INSERT INTO content (tmdb_id, type, title, overview, release_date, poster_path, backdrop_path, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        testTvShow.tmdb_id,
        testTvShow.type,
        testTvShow.title,
        testTvShow.overview,
        testTvShow.release_date,
        testTvShow.poster_path,
        testTvShow.backdrop_path,
        JSON.stringify(testTvShow.metadata),
      ],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 inserted row, got " + result.length);
    }

    const content = result[0];
    console.log("✓ TV show inserted successfully:");
    console.log(`  ID: ${content.id}`);
    console.log(`  TMDB ID: ${content.tmdb_id}`);
    console.log(`  Type: ${content.type}`);
    console.log(`  Title: ${content.title}`);
    console.log(`  Release Date: ${content.release_date}`);
    console.log(`  Metadata: ${JSON.stringify(content.metadata)}`);

    // Verify fields
    if (content.type !== testTvShow.type) {
      throw new Error(
        `Type mismatch: expected ${testTvShow.type}, got ${content.type}`,
      );
    }
    if (content.title !== testTvShow.title) {
      throw new Error(
        `Title mismatch: expected ${testTvShow.title}, got ${content.title}`,
      );
    }

    return content.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ TV show insertion test failed:", message);
    throw error;
  }
}

async function testRetrieveContent(contentId: string) {
  console.log("\nTesting content retrieval...");

  try {
    const result = await query<Content>(
      "SELECT * FROM content WHERE id = $1",
      [contentId],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 content item, got " + result.length);
    }

    const content = result[0];
    console.log("✓ Content retrieved successfully:");
    console.log(`  ID: ${content.id}`);
    console.log(`  TMDB ID: ${content.tmdb_id}`);
    console.log(`  Type: ${content.type}`);
    console.log(`  Title: ${content.title}`);

    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Content retrieval test failed:", message);
    throw error;
  }
}

async function testQueryByType() {
  console.log("\nTesting query by content type...");

  try {
    const movies = await query<Content>(
      "SELECT * FROM content WHERE type = $1",
      ["movie"],
    );

    const tvShows = await query<Content>(
      "SELECT * FROM content WHERE type = $1",
      ["tv"],
    );

    console.log(`Found ${movies.length} movie(s)`);
    console.log(`Found ${tvShows.length} TV show(s)`);

    if (movies.length === 0) {
      throw new Error("Expected at least 1 movie");
    }
    if (tvShows.length === 0) {
      throw new Error("Expected at least 1 TV show");
    }

    // Verify all movies have type 'movie'
    const invalidMovies = movies.filter((m) => m.type !== "movie");
    if (invalidMovies.length > 0) {
      throw new Error(
        `Found ${invalidMovies.length} items with incorrect type in movies query`,
      );
    }

    // Verify all TV shows have type 'tv'
    const invalidTvShows = tvShows.filter((t) => t.type !== "tv");
    if (invalidTvShows.length > 0) {
      throw new Error(
        `Found ${invalidTvShows.length} items with incorrect type in TV shows query`,
      );
    }

    console.log("✓ Query by type working correctly");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Query by type test failed:", message);
    throw error;
  }
}

async function main() {
  console.log("Content Table Migration Tests\n");
  console.log("=".repeat(50));

  try {
    await verifyEnumType();
    await verifyTableStructure();
    const movieId = await testInsertMovie();
    const tvShowId = await testInsertTvShow();
    await testRetrieveContent(movieId);
    await testRetrieveContent(tvShowId);
    await testQueryByType();

    console.log("\n" + "=".repeat(50));
    console.log("✓ All content table tests passed!");
  } catch (_error) {
    console.error("\n" + "=".repeat(50));
    console.error("✗ Content table tests failed!");
    Deno.exit(1);
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  await main();
}
