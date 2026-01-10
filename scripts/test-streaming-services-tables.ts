#!/usr/bin/env -S deno run -A

/**
 * Test script for streaming_services and content_streaming tables migration
 *
 * Tests:
 * 1. Verify tables exist with correct columns
 * 2. Test creating streaming services
 * 3. Test querying availability for a title in a specific region
 * 4. Test unique constraint on (service_id, content_id, region, type)
 * 5. Test foreign key constraints
 * 6. Test cascade delete behaviour
 */

import { closePool, query } from "../lib/db.ts";

interface StreamingService {
  id: string;
  name: string;
  logo_url: string | null;
  deep_link_template: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ContentStreaming {
  id: string;
  service_id: string;
  content_id: string;
  region: string;
  type: "subscription" | "rent" | "buy";
  price: number | null;
  available_from: Date | null;
  available_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

async function verifyTableStructure() {
  console.log("Verifying streaming_services table structure...");

  try {
    // Check streaming_services table
    const servicesResult = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      udt_name: string;
    }>(`
      SELECT column_name, data_type, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_name = 'streaming_services'
      ORDER BY ordinal_position
    `);

    const expectedServicesColumns = [
      { name: "id", type: "uuid" },
      { name: "name", type: "character varying" },
      { name: "logo_url", type: "text" },
      { name: "deep_link_template", type: "text" },
      { name: "created_at", type: "timestamp with time zone" },
      { name: "updated_at", type: "timestamp with time zone" },
    ];

    console.log(
      `Found ${servicesResult.length} columns in streaming_services table:`,
    );
    servicesResult.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const foundServicesColumns = new Set(
      servicesResult.map((r) => r.column_name),
    );
    const missingServicesColumns = expectedServicesColumns.filter(
      (ec) => !foundServicesColumns.has(ec.name),
    );

    if (missingServicesColumns.length > 0) {
      throw new Error(
        `Missing columns in streaming_services table: ${
          missingServicesColumns.map((c) => c.name).join(", ")
        }`,
      );
    }

    // Check content_streaming table
    const contentStreamingResult = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      udt_name: string;
    }>(`
      SELECT column_name, data_type, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_name = 'content_streaming'
      ORDER BY ordinal_position
    `);

    const expectedContentStreamingColumns = [
      { name: "id", type: "uuid" },
      { name: "service_id", type: "uuid" },
      { name: "content_id", type: "uuid" },
      { name: "region", type: "character varying" },
      { name: "type", type: "USER-DEFINED" }, // enum type
      { name: "price", type: "numeric" },
      { name: "available_from", type: "date" },
      { name: "available_until", type: "date" },
      { name: "created_at", type: "timestamp with time zone" },
      { name: "updated_at", type: "timestamp with time zone" },
    ];

    console.log(
      `\nFound ${contentStreamingResult.length} columns in content_streaming table:`,
    );
    contentStreamingResult.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const foundContentStreamingColumns = new Set(
      contentStreamingResult.map((r) => r.column_name),
    );
    const missingContentStreamingColumns = expectedContentStreamingColumns
      .filter(
        (ec) => !foundContentStreamingColumns.has(ec.name),
      );

    if (missingContentStreamingColumns.length > 0) {
      throw new Error(
        `Missing columns in content_streaming table: ${
          missingContentStreamingColumns.map((c) => c.name).join(", ")
        }`,
      );
    }

    // Verify enum type exists
    const enumResult = await query<{
      typname: string;
      typtype: string;
    }>(`
      SELECT typname, typtype
      FROM pg_type
      WHERE typname = 'streaming_type'
    `);

    if (enumResult.length === 0) {
      throw new Error("streaming_type enum not found");
    }

    console.log(`\n✓ Found streaming_type enum`);

    // Verify foreign key constraints
    const fkResult = await query<{
      constraint_name: string;
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
      delete_rule: string;
    }>(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (tc.table_name = 'content_streaming')
      ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
    `);

    console.log(`\nFound ${fkResult.length} foreign key constraint(s):`);
    fkResult.forEach((fk) => {
      console.log(
        `  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`,
      );
    });

    // Verify content_streaming.service_id foreign key
    const serviceIdFk = fkResult.find(
      (fk) =>
        fk.table_name === "content_streaming" &&
        fk.column_name === "service_id",
    );
    if (
      !serviceIdFk || serviceIdFk.foreign_table_name !== "streaming_services"
    ) {
      throw new Error(
        "Missing or incorrect foreign key for content_streaming.service_id",
      );
    }
    if (serviceIdFk.delete_rule !== "CASCADE") {
      throw new Error(
        `content_streaming.service_id foreign key should have CASCADE delete, got ${serviceIdFk.delete_rule}`,
      );
    }

    // Verify content_streaming.content_id foreign key
    const contentIdFk = fkResult.find(
      (fk) =>
        fk.table_name === "content_streaming" &&
        fk.column_name === "content_id",
    );
    if (!contentIdFk || contentIdFk.foreign_table_name !== "content") {
      throw new Error(
        "Missing or incorrect foreign key for content_streaming.content_id",
      );
    }
    if (contentIdFk.delete_rule !== "CASCADE") {
      throw new Error(
        `content_streaming.content_id foreign key should have CASCADE delete, got ${contentIdFk.delete_rule}`,
      );
    }

    // Verify unique constraint on (service_id, content_id, region, type)
    const uniqueResult = await query<{
      constraint_name: string;
      column_name: string;
    }>(`
      SELECT
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name = 'content_streaming'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);

    const uniqueColumns = uniqueResult
      .filter((u) => u.constraint_name !== "content_streaming_pkey") // Exclude primary key
      .map((u) => u.column_name);

    console.log(
      `\nFound unique constraint columns in content_streaming: ${
        uniqueColumns.join(", ")
      }`,
    );

    const requiredUniqueColumns = [
      "service_id",
      "content_id",
      "region",
      "type",
    ];
    const missingUniqueColumns = requiredUniqueColumns.filter(
      (col) => !uniqueColumns.includes(col),
    );

    if (missingUniqueColumns.length > 0) {
      throw new Error(
        `Missing unique constraint columns in content_streaming: ${
          missingUniqueColumns.join(", ")
        }`,
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

async function verifySeededServices() {
  console.log("\nVerifying seeded streaming services...");

  try {
    const result = await query<StreamingService>(
      `SELECT * FROM streaming_services ORDER BY name`,
    );

    console.log(`Found ${result.length} streaming service(s):`);
    result.forEach((service) => {
      console.log(`  - ${service.name}`);
    });

    const expectedServices = [
      "Netflix",
      "Disney+",
      "Amazon Prime Video",
      "Apple TV+",
      "HBO Max",
      "Hulu",
      "Paramount+",
      "Peacock",
      "BBC iPlayer",
      "ITV Hub",
    ];

    const foundServices = new Set(result.map((s) => s.name));
    const missingServices = expectedServices.filter(
      (s) => !foundServices.has(s),
    );

    if (missingServices.length > 0) {
      throw new Error(
        `Missing seeded services: ${missingServices.join(", ")}`,
      );
    }

    console.log("✓ All expected services found");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Seeded services verification failed:", message);
    throw error;
  }
}

async function createTestContent(tmdbId: number, title: string) {
  console.log(`\nCreating test content: ${title}...`);

  try {
    const result = await query<{ id: string }>(
      `INSERT INTO content (tmdb_id, type, title) VALUES ($1, $2, $3) RETURNING id`,
      [tmdbId, "movie", title],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 content created, got " + result.length);
    }

    console.log(`✓ Test content created: ${result[0].id}`);
    return result[0].id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Content creation failed:", message);
    throw error;
  }
}

async function testAddStreamingAvailability(
  serviceId: string,
  contentId: string,
  region: string,
  type: "subscription" | "rent" | "buy",
  price?: number,
) {
  console.log(
    `\nTesting adding streaming availability: ${region}, ${type}...`,
  );

  try {
    const result = await query<ContentStreaming>(
      `
      INSERT INTO content_streaming (service_id, content_id, region, type, price)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [serviceId, contentId, region, type, price || null],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 availability created, got " + result.length);
    }

    const availability = result[0];
    console.log("✓ Streaming availability created successfully:");
    console.log(`  ID: ${availability.id}`);
    console.log(`  Service ID: ${availability.service_id}`);
    console.log(`  Content ID: ${availability.content_id}`);
    console.log(`  Region: ${availability.region}`);
    console.log(`  Type: ${availability.type}`);
    console.log(`  Price: ${availability.price || "N/A"}`);

    // Verify fields
    if (availability.service_id !== serviceId) {
      throw new Error(
        `Service ID mismatch: expected ${serviceId}, got ${availability.service_id}`,
      );
    }
    if (availability.content_id !== contentId) {
      throw new Error(
        `Content ID mismatch: expected ${contentId}, got ${availability.content_id}`,
      );
    }
    if (availability.region !== region) {
      throw new Error(
        `Region mismatch: expected ${region}, got ${availability.region}`,
      );
    }
    if (availability.type !== type) {
      throw new Error(
        `Type mismatch: expected ${type}, got ${availability.type}`,
      );
    }

    return availability.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Add streaming availability test failed:", message);
    throw error;
  }
}

async function testQueryAvailabilityForRegion(
  contentId: string,
  region: string,
) {
  console.log(`\nTesting querying availability for region: ${region}...`);

  try {
    const result = await query<ContentStreaming & { service_name: string }>(
      `
      SELECT cs.*, ss.name as service_name
      FROM content_streaming cs
      JOIN streaming_services ss ON cs.service_id = ss.id
      WHERE cs.content_id = $1 AND cs.region = $2
      ORDER BY cs.type, ss.name
    `,
      [contentId, region],
    );

    console.log(`Found ${result.length} availability option(s) for ${region}:`);
    result.forEach((avail, index) => {
      console.log(
        `  ${index + 1}. ${avail.service_name} - ${avail.type}${
          avail.price ? ` (£${avail.price})` : ""
        }`,
      );
    });

    if (result.length === 0) {
      throw new Error(`Expected at least 1 availability for ${region}`);
    }

    console.log("✓ Query availability test passed");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Query availability test failed:", message);
    throw error;
  }
}

async function testUniqueConstraint(
  serviceId: string,
  contentId: string,
  region: string,
  type: "subscription" | "rent" | "buy",
) {
  console.log(
    `\nTesting unique constraint on (service_id, content_id, region, type)...`,
  );

  try {
    // Try to insert duplicate
    await query(
      `
      INSERT INTO content_streaming (service_id, content_id, region, type)
      VALUES ($1, $2, $3, $4)
    `,
      [serviceId, contentId, region, type],
    );

    throw new Error(
      "Expected unique constraint violation, but insert succeeded",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unique") || message.includes("duplicate")) {
      console.log(
        "✓ Unique constraint working correctly (duplicate availability rejected)",
      );
      return true;
    }
    throw error;
  }
}

async function testCascadeDelete(serviceId: string, contentId: string) {
  console.log("\nTesting cascade delete behaviour...");

  try {
    // Count content_streaming records before deletion
    const beforeCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM content_streaming WHERE service_id = $1 OR content_id = $2`,
      [serviceId, contentId],
    );

    const countBefore = parseInt(beforeCount[0].count);
    console.log(
      `Found ${countBefore} content_streaming record(s) before deletion`,
    );

    if (countBefore === 0) {
      throw new Error(
        "Expected at least 1 content_streaming record before deletion",
      );
    }

    // Delete the content (should cascade delete content_streaming)
    await query(`DELETE FROM content WHERE id = $1`, [contentId]);
    console.log("✓ Content deleted");

    // Verify content_streaming records are deleted
    const afterCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM content_streaming WHERE content_id = $1`,
      [contentId],
    );

    const countAfter = parseInt(afterCount[0].count);
    if (countAfter !== 0) {
      throw new Error(
        `Expected 0 content_streaming records after content deletion, got ${countAfter}`,
      );
    }

    console.log("✓ Cascade delete from content table working correctly");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Cascade delete test failed:", message);
    throw error;
  }
}

async function main() {
  console.log("Streaming Services Tables Migration Tests\n");
  console.log("=".repeat(50));

  try {
    await verifyTableStructure();
    const services = await verifySeededServices();

    // Get Netflix service ID
    const netflix = services.find((s) => s.name === "Netflix");
    if (!netflix) {
      throw new Error("Netflix service not found");
    }

    const disneyPlus = services.find((s) => s.name === "Disney+");
    if (!disneyPlus) {
      throw new Error("Disney+ service not found");
    }

    const amazonPrime = services.find((s) => s.name === "Amazon Prime Video");
    if (!amazonPrime) {
      throw new Error("Amazon Prime Video service not found");
    }

    // Create test content
    const contentId = await createTestContent(550, "Fight Club");

    // Test adding different types of availability
    await testAddStreamingAvailability(
      netflix.id,
      contentId,
      "US",
      "subscription",
    );
    await testAddStreamingAvailability(
      disneyPlus.id,
      contentId,
      "US",
      "subscription",
    );
    await testAddStreamingAvailability(
      amazonPrime.id,
      contentId,
      "US",
      "rent",
      3.99,
    );
    await testAddStreamingAvailability(
      amazonPrime.id,
      contentId,
      "US",
      "buy",
      9.99,
    );

    // Test UK region availability
    await testAddStreamingAvailability(
      netflix.id,
      contentId,
      "GB",
      "subscription",
    );

    // Test querying availability for a specific region
    await testQueryAvailabilityForRegion(contentId, "US");
    await testQueryAvailabilityForRegion(contentId, "GB");

    // Test unique constraint
    await testUniqueConstraint(netflix.id, contentId, "US", "subscription");

    // Create new content for cascade delete test
    const contentId2 = await createTestContent(238, "The Godfather");
    await testAddStreamingAvailability(
      netflix.id,
      contentId2,
      "US",
      "subscription",
    );
    await testCascadeDelete(netflix.id, contentId2);

    console.log("\n" + "=".repeat(50));
    console.log("✓ All streaming services tables tests passed!");
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("✗ Streaming services tables tests failed!");
    console.error(error);
    Deno.exit(1);
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  await main();
}
