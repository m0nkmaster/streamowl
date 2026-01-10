#!/usr/bin/env -S deno run -A

/**
 * Test script for users table migration
 *
 * Tests:
 * 1. Verify table exists with correct columns
 * 2. Test inserting a user record
 * 3. Test retrieving a user record
 */

import { closePool, query } from "../lib/db.ts";

interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

async function verifyTableStructure() {
  console.log("Verifying users table structure...");

  try {
    // Check if table exists and get column information
    const result = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    const expectedColumns = [
      { name: "id", type: "uuid" },
      { name: "email", type: "character varying" },
      { name: "display_name", type: "character varying" },
      { name: "avatar_url", type: "text" },
      { name: "preferences", type: "jsonb" },
      { name: "created_at", type: "timestamp with time zone" },
      { name: "updated_at", type: "timestamp with time zone" },
    ];

    console.log(`Found ${result.length} columns in users table:`);
    result.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
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

    console.log("✓ Table structure verified");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Table structure verification failed:", message);
    throw error;
  }
}

async function testInsertUser() {
  console.log("\nTesting user insertion...");

  try {
    const testEmail = `test-${Date.now()}@example.com`;
    const testDisplayName = "Test User";
    const testAvatarUrl = "https://example.com/avatar.jpg";
    const testPreferences = { theme: "dark", notifications: true };

    const result = await query<User>(
      `
      INSERT INTO users (email, display_name, avatar_url, preferences)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [
        testEmail,
        testDisplayName,
        testAvatarUrl,
        JSON.stringify(testPreferences),
      ],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 inserted row, got " + result.length);
    }

    const user = result[0];
    console.log("✓ User inserted successfully:");
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.display_name}`);
    console.log(`  Avatar URL: ${user.avatar_url}`);
    console.log(`  Preferences: ${JSON.stringify(user.preferences)}`);
    console.log(`  Created At: ${user.created_at}`);
    console.log(`  Updated At: ${user.updated_at}`);

    // Verify fields
    if (user.email !== testEmail) {
      throw new Error(
        `Email mismatch: expected ${testEmail}, got ${user.email}`,
      );
    }
    if (user.display_name !== testDisplayName) {
      throw new Error(
        `Display name mismatch: expected ${testDisplayName}, got ${user.display_name}`,
      );
    }
    if (!user.id || typeof user.id !== "string") {
      throw new Error("ID is not a valid UUID string");
    }
    if (!user.created_at || !user.updated_at) {
      throw new Error("Timestamps not set");
    }

    return user.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ User insertion test failed:", message);
    throw error;
  }
}

async function testRetrieveUser(userId: string) {
  console.log("\nTesting user retrieval...");

  try {
    const result = await query<User>(
      "SELECT * FROM users WHERE id = $1",
      [userId],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 user, got " + result.length);
    }

    const user = result[0];
    console.log("✓ User retrieved successfully:");
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.display_name}`);

    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ User retrieval test failed:", message);
    throw error;
  }
}

async function testUpdatedAtTrigger() {
  console.log("\nTesting updated_at trigger...");

  try {
    // Create a test user
    const insertResult = await query<User>(
      "INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING *",
      [`trigger-test-${Date.now()}@example.com`, "Trigger Test"],
    );

    const userId = insertResult[0].id;
    const originalUpdatedAt = insertResult[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update the user
    await query(
      "UPDATE users SET display_name = $1 WHERE id = $2",
      ["Updated Name", userId],
    );

    // Retrieve and check updated_at
    const updatedResult = await query<User>(
      "SELECT * FROM users WHERE id = $1",
      [userId],
    );

    const newUpdatedAt = updatedResult[0].updated_at;

    if (newUpdatedAt <= originalUpdatedAt) {
      throw new Error(
        `updated_at not updated: ${newUpdatedAt} <= ${originalUpdatedAt}`,
      );
    }

    console.log("✓ updated_at trigger working correctly");
    console.log(`  Original: ${originalUpdatedAt}`);
    console.log(`  Updated: ${newUpdatedAt}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ updated_at trigger test failed:", message);
    throw error;
  }
}

async function main() {
  console.log("Users Table Migration Tests\n");
  console.log("=".repeat(50));

  try {
    await verifyTableStructure();
    const userId = await testInsertUser();
    await testRetrieveUser(userId);
    await testUpdatedAtTrigger();

    console.log("\n" + "=".repeat(50));
    console.log("✓ All users table tests passed!");
  } catch (_error) {
    console.error("\n" + "=".repeat(50));
    console.error("✗ Users table tests failed!");
    Deno.exit(1);
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  await main();
}
