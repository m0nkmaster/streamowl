#!/usr/bin/env -S deno run -A

/**
 * Test script for user_content table migration
 *
 * Tests:
 * 1. Verify table exists with correct columns
 * 2. Verify user_content_status enum exists
 * 3. Test inserting user_content records
 * 4. Test unique constraint on (user_id, content_id)
 * 5. Test cascade delete behaviour
 */

import { closePool, query } from "../lib/db.ts";

interface UserContent {
  id: string;
  user_id: string;
  content_id: string;
  status: "watched" | "to_watch" | "favourite";
  rating: number | null;
  notes: string | null;
  watched_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

async function verifyEnumType() {
  console.log("Verifying user_content_status enum...");

  try {
    const result = await query<{
      typname: string;
      enumlabel: string;
    }>(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'user_content_status'
      ORDER BY e.enumsortorder
    `);

    const expectedValues = ["watched", "to_watch", "favourite"];
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

    console.log("✓ user_content_status enum verified");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Enum verification failed:", message);
    throw error;
  }
}

async function verifyTableStructure() {
  console.log("\nVerifying user_content table structure...");

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
      WHERE table_name = 'user_content'
      ORDER BY ordinal_position
    `);

    const expectedColumns = [
      { name: "id", type: "uuid" },
      { name: "user_id", type: "uuid" },
      { name: "content_id", type: "uuid" },
      { name: "status", type: "USER-DEFINED" }, // enum type
      { name: "rating", type: "numeric" },
      { name: "notes", type: "text" },
      { name: "watched_at", type: "timestamp with time zone" },
      { name: "created_at", type: "timestamp with time zone" },
      { name: "updated_at", type: "timestamp with time zone" },
    ];

    console.log(`Found ${result.length} columns in user_content table:`);
    result.forEach((col) => {
      const typeDisplay = col.udt_name === "user_content_status"
        ? `user_content_status (enum)`
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

    // Verify status column is enum
    const statusColumn = result.find((r) => r.column_name === "status");
    if (!statusColumn || statusColumn.udt_name !== "user_content_status") {
      throw new Error(
        `Status column should be user_content_status enum, got ${statusColumn?.udt_name}`,
      );
    }

    // Verify foreign key constraints exist
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
        AND tc.table_name = 'user_content'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);

    console.log(`\nFound ${fkResult.length} foreign key constraint(s):`);
    fkResult.forEach((fk) => {
      console.log(
        `  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`,
      );
    });

    // Verify foreign keys exist and have CASCADE delete
    const userFk = fkResult.find((fk) => fk.column_name === "user_id");
    const contentFk = fkResult.find((fk) => fk.column_name === "content_id");

    if (!userFk || userFk.foreign_table_name !== "users") {
      throw new Error("Missing or incorrect foreign key for user_id");
    }
    if (userFk.delete_rule !== "CASCADE") {
      throw new Error(
        `user_id foreign key should have CASCADE delete, got ${userFk.delete_rule}`,
      );
    }

    if (!contentFk || contentFk.foreign_table_name !== "content") {
      throw new Error("Missing or incorrect foreign key for content_id");
    }
    if (contentFk.delete_rule !== "CASCADE") {
      throw new Error(
        `content_id foreign key should have CASCADE delete, got ${contentFk.delete_rule}`,
      );
    }

    // Verify unique constraint on (user_id, content_id)
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
        AND tc.table_name = 'user_content'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);

    const uniqueColumns = uniqueResult
      .filter((u) => u.constraint_name !== "user_content_pkey") // Exclude primary key
      .map((u) => u.column_name);

    console.log(
      `\nFound unique constraint columns: ${uniqueColumns.join(", ")}`,
    );

    if (
      !uniqueColumns.includes("user_id") ||
      !uniqueColumns.includes("content_id")
    ) {
      throw new Error(
        "Missing unique constraint on (user_id, content_id)",
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

async function createTestUser() {
  console.log("\nCreating test user...");

  try {
    const result = await query<{ id: string }>(
      `INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id`,
      ["test@example.com", "Test User"],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 user created, got " + result.length);
    }

    console.log(`✓ Test user created: ${result[0].id}`);
    return result[0].id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ User creation failed:", message);
    throw error;
  }
}

async function createTestContent() {
  console.log("\nCreating test content...");

  try {
    const result = await query<{ id: string }>(
      `INSERT INTO content (tmdb_id, type, title) VALUES ($1, $2, $3) RETURNING id`,
      [12345, "movie", "Test Movie"],
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

async function testInsertUserContent(
  userId: string,
  contentId: string,
  status: "watched" | "to_watch" | "favourite",
  rating?: number,
  notes?: string,
) {
  console.log(`\nTesting user_content insertion (status: ${status})...`);

  try {
    const watchedAt = status === "watched" ? new Date() : null;

    const result = await query<UserContent>(
      `
      INSERT INTO user_content (user_id, content_id, status, rating, notes, watched_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [userId, contentId, status, rating || null, notes || null, watchedAt],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 inserted row, got " + result.length);
    }

    const userContent = result[0];
    console.log("✓ user_content inserted successfully:");
    console.log(`  ID: ${userContent.id}`);
    console.log(`  User ID: ${userContent.user_id}`);
    console.log(`  Content ID: ${userContent.content_id}`);
    console.log(`  Status: ${userContent.status}`);
    console.log(`  Rating: ${userContent.rating || "null"}`);
    console.log(`  Notes: ${userContent.notes || "null"}`);
    console.log(`  Watched At: ${userContent.watched_at || "null"}`);

    // Verify fields
    if (userContent.user_id !== userId) {
      throw new Error(
        `User ID mismatch: expected ${userId}, got ${userContent.user_id}`,
      );
    }
    if (userContent.content_id !== contentId) {
      throw new Error(
        `Content ID mismatch: expected ${contentId}, got ${userContent.content_id}`,
      );
    }
    if (userContent.status !== status) {
      throw new Error(
        `Status mismatch: expected ${status}, got ${userContent.status}`,
      );
    }

    return userContent.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ user_content insertion test failed:", message);
    throw error;
  }
}

async function testUniqueConstraint(userId: string, contentId: string) {
  console.log("\nTesting unique constraint on (user_id, content_id)...");

  try {
    // Try to insert duplicate
    await query(
      `
      INSERT INTO user_content (user_id, content_id, status)
      VALUES ($1, $2, $3)
    `,
      [userId, contentId, "to_watch"],
    );

    throw new Error(
      "Expected unique constraint violation, but insert succeeded",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unique") || message.includes("duplicate")) {
      console.log(
        "✓ Unique constraint working correctly (duplicate insert rejected)",
      );
      return true;
    }
    throw error;
  }
}

async function testCascadeDelete(userId: string, contentId: string) {
  console.log("\nTesting cascade delete behaviour...");

  try {
    // Count user_content records before deletion
    const beforeCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_content WHERE user_id = $1 OR content_id = $2`,
      [userId, contentId],
    );

    const countBefore = parseInt(beforeCount[0].count);
    console.log(`Found ${countBefore} user_content record(s) before deletion`);

    if (countBefore === 0) {
      throw new Error(
        "Expected at least 1 user_content record before deletion",
      );
    }

    // Delete the user (should cascade delete user_content)
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
    console.log("✓ User deleted");

    // Verify user_content records are also deleted
    const afterUserDelete = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_content WHERE user_id = $1`,
      [userId],
    );

    const countAfterUserDelete = parseInt(afterUserDelete[0].count);
    if (countAfterUserDelete !== 0) {
      throw new Error(
        `Expected 0 user_content records after user deletion, got ${countAfterUserDelete}`,
      );
    }

    console.log("✓ Cascade delete from users table working correctly");

    // Create new user and content for content deletion test
    const newUserId = await createTestUser();
    const newContentId = await createTestContent();
    await testInsertUserContent(newUserId, newContentId, "watched", 8.5);

    // Delete the content (should cascade delete user_content)
    await query(`DELETE FROM content WHERE id = $1`, [newContentId]);
    console.log("✓ Content deleted");

    // Verify user_content records are also deleted
    const afterContentDelete = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_content WHERE content_id = $1`,
      [newContentId],
    );

    const countAfterContentDelete = parseInt(afterContentDelete[0].count);
    if (countAfterContentDelete !== 0) {
      throw new Error(
        `Expected 0 user_content records after content deletion, got ${countAfterContentDelete}`,
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
  console.log("User Content Table Migration Tests\n");
  console.log("=".repeat(50));

  try {
    await verifyEnumType();
    await verifyTableStructure();

    const userId = await createTestUser();
    const contentId = await createTestContent();

    await testInsertUserContent(
      userId,
      contentId,
      "watched",
      8.5,
      "Great film!",
    );
    await testUniqueConstraint(userId, contentId);

    // Create new records for cascade delete test
    const userId2 = await createTestUser();
    const contentId2 = await createTestContent();
    await testInsertUserContent(userId2, contentId2, "favourite", 9.0);
    await testCascadeDelete(userId2, contentId2);

    console.log("\n" + "=".repeat(50));
    console.log("✓ All user_content table tests passed!");
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("✗ user_content table tests failed!");
    console.error(error);
    Deno.exit(1);
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  await main();
}
