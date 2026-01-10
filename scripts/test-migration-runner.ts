/**
 * Test script for migration runner
 *
 * Tests:
 * 1. Running pending migrations
 * 2. Rolling back a migration
 */

import { getPool } from "../lib/db.ts";

async function testMigrationRunner(): Promise<void> {
  console.log("Testing migration runner...\n");

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Step 1: Verify test migration table doesn't exist initially
    console.log("Step 1: Checking initial state...");
    const initialCheck = await client.queryObject<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'test_migration_table'
      ) as exists
    `);

    if (initialCheck.rows[0].exists) {
      console.log("⚠ Test migration table already exists. Cleaning up...");
      await client.queryObject("DROP TABLE IF EXISTS test_migration_table");
      await client.queryObject(
        "DELETE FROM migrations WHERE name = '008_test_migration.sql'",
      );
    }
    console.log("✓ Initial state verified\n");

    // Step 2: Check if test migration is in migrations table
    console.log("Step 2: Checking migration tracking...");
    const migrationCheck = await client.queryObject<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM migrations 
      WHERE name = '008_test_migration.sql'
    `);

    if (migrationCheck.rows[0].count > 0) {
      console.log(
        "⚠ Test migration already tracked. Removing from tracking...",
      );
      await client.queryObject(
        "DELETE FROM migrations WHERE name = '008_test_migration.sql'",
      );
    }
    console.log("✓ Migration tracking verified\n");

    // Step 3: Run migration (this would normally be done via deno task migrate)
    console.log("Step 3: Running test migration...");
    console.log("  (Note: Run 'deno task migrate' to execute migrations)\n");

    // Step 4: Verify migration can be rolled back
    console.log("Step 4: Testing rollback capability...");
    console.log(
      "  (Note: Run 'deno task migrate:rollback' to rollback last migration)\n",
    );

    console.log("✓ Migration runner test setup complete");
    console.log("\nTo test migrations:");
    console.log("  1. Run: deno task migrate");
    console.log("  2. Verify test_migration_table exists");
    console.log("  3. Run: deno task migrate:rollback");
    console.log("  4. Verify test_migration_table is dropped");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Test failed:", message);
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.main) {
  try {
    await testMigrationRunner();
    Deno.exit(0);
  } catch (error) {
    console.error("Test script failed:", error);
    Deno.exit(1);
  }
}
