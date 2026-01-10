#!/usr/bin/env -S deno run -A

/**
 * Test script for lists and list_items tables migration
 *
 * Tests:
 * 1. Verify tables exist with correct columns
 * 2. Test creating a list
 * 3. Test adding items to a list with ordering
 * 4. Test foreign key constraints
 * 5. Test cascade delete behaviour
 */

import { closePool, query } from "../lib/db.ts";

interface List {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ListItem {
  id: string;
  list_id: string;
  content_id: string;
  position: number;
  created_at: Date;
}

async function verifyTableStructure() {
  console.log("Verifying lists table structure...");

  try {
    // Check lists table
    const listsResult = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      udt_name: string;
    }>(`
      SELECT column_name, data_type, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_name = 'lists'
      ORDER BY ordinal_position
    `);

    const expectedListsColumns = [
      { name: "id", type: "uuid" },
      { name: "user_id", type: "uuid" },
      { name: "name", type: "character varying" },
      { name: "description", type: "text" },
      { name: "is_public", type: "boolean" },
      { name: "created_at", type: "timestamp with time zone" },
      { name: "updated_at", type: "timestamp with time zone" },
    ];

    console.log(`Found ${listsResult.length} columns in lists table:`);
    listsResult.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const foundListsColumns = new Set(listsResult.map((r) => r.column_name));
    const missingListsColumns = expectedListsColumns.filter(
      (ec) => !foundListsColumns.has(ec.name),
    );

    if (missingListsColumns.length > 0) {
      throw new Error(
        `Missing columns in lists table: ${
          missingListsColumns.map((c) => c.name).join(", ")
        }`,
      );
    }

    // Check list_items table
    const itemsResult = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      udt_name: string;
    }>(`
      SELECT column_name, data_type, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_name = 'list_items'
      ORDER BY ordinal_position
    `);

    const expectedItemsColumns = [
      { name: "id", type: "uuid" },
      { name: "list_id", type: "uuid" },
      { name: "content_id", type: "uuid" },
      { name: "position", type: "integer" },
      { name: "created_at", type: "timestamp with time zone" },
    ];

    console.log(`\nFound ${itemsResult.length} columns in list_items table:`);
    itemsResult.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const foundItemsColumns = new Set(itemsResult.map((r) => r.column_name));
    const missingItemsColumns = expectedItemsColumns.filter(
      (ec) => !foundItemsColumns.has(ec.name),
    );

    if (missingItemsColumns.length > 0) {
      throw new Error(
        `Missing columns in list_items table: ${
          missingItemsColumns.map((c) => c.name).join(", ")
        }`,
      );
    }

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
        AND (tc.table_name = 'lists' OR tc.table_name = 'list_items')
      ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
    `);

    console.log(`\nFound ${fkResult.length} foreign key constraint(s):`);
    fkResult.forEach((fk) => {
      console.log(
        `  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`,
      );
    });

    // Verify lists.user_id foreign key
    const listsUserFk = fkResult.find(
      (fk) => fk.table_name === "lists" && fk.column_name === "user_id",
    );
    if (!listsUserFk || listsUserFk.foreign_table_name !== "users") {
      throw new Error("Missing or incorrect foreign key for lists.user_id");
    }
    if (listsUserFk.delete_rule !== "CASCADE") {
      throw new Error(
        `lists.user_id foreign key should have CASCADE delete, got ${listsUserFk.delete_rule}`,
      );
    }

    // Verify list_items.list_id foreign key
    const itemsListFk = fkResult.find(
      (fk) => fk.table_name === "list_items" && fk.column_name === "list_id",
    );
    if (!itemsListFk || itemsListFk.foreign_table_name !== "lists") {
      throw new Error(
        "Missing or incorrect foreign key for list_items.list_id",
      );
    }
    if (itemsListFk.delete_rule !== "CASCADE") {
      throw new Error(
        `list_items.list_id foreign key should have CASCADE delete, got ${itemsListFk.delete_rule}`,
      );
    }

    // Verify list_items.content_id foreign key
    const itemsContentFk = fkResult.find(
      (fk) => fk.table_name === "list_items" && fk.column_name === "content_id",
    );
    if (!itemsContentFk || itemsContentFk.foreign_table_name !== "content") {
      throw new Error(
        "Missing or incorrect foreign key for list_items.content_id",
      );
    }
    if (itemsContentFk.delete_rule !== "CASCADE") {
      throw new Error(
        `list_items.content_id foreign key should have CASCADE delete, got ${itemsContentFk.delete_rule}`,
      );
    }

    // Verify unique constraint on (list_id, content_id)
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
        AND tc.table_name = 'list_items'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);

    const uniqueColumns = uniqueResult
      .filter((u) => u.constraint_name !== "list_items_pkey") // Exclude primary key
      .map((u) => u.column_name);

    console.log(
      `\nFound unique constraint columns in list_items: ${
        uniqueColumns.join(", ")
      }`,
    );

    if (
      !uniqueColumns.includes("list_id") ||
      !uniqueColumns.includes("content_id")
    ) {
      throw new Error(
        "Missing unique constraint on list_items (list_id, content_id)",
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
      ["test-lists@example.com", "Test Lists User"],
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

async function testCreateList(
  userId: string,
  name: string,
  description: string | null,
  isPublic: boolean,
) {
  console.log(`\nTesting list creation: ${name}...`);

  try {
    const result = await query<List>(
      `
      INSERT INTO lists (user_id, name, description, is_public)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [userId, name, description, isPublic],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 list created, got " + result.length);
    }

    const list = result[0];
    console.log("✓ List created successfully:");
    console.log(`  ID: ${list.id}`);
    console.log(`  User ID: ${list.user_id}`);
    console.log(`  Name: ${list.name}`);
    console.log(`  Description: ${list.description || "null"}`);
    console.log(`  Is Public: ${list.is_public}`);

    // Verify fields
    if (list.user_id !== userId) {
      throw new Error(
        `User ID mismatch: expected ${userId}, got ${list.user_id}`,
      );
    }
    if (list.name !== name) {
      throw new Error(`Name mismatch: expected ${name}, got ${list.name}`);
    }
    if (list.is_public !== isPublic) {
      throw new Error(
        `Is Public mismatch: expected ${isPublic}, got ${list.is_public}`,
      );
    }

    return list.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ List creation test failed:", message);
    throw error;
  }
}

async function testAddListItem(
  listId: string,
  contentId: string,
  position: number,
) {
  console.log(`\nTesting adding item to list (position: ${position})...`);

  try {
    const result = await query<ListItem>(
      `
      INSERT INTO list_items (list_id, content_id, position)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [listId, contentId, position],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 list item created, got " + result.length);
    }

    const item = result[0];
    console.log("✓ List item added successfully:");
    console.log(`  ID: ${item.id}`);
    console.log(`  List ID: ${item.list_id}`);
    console.log(`  Content ID: ${item.content_id}`);
    console.log(`  Position: ${item.position}`);

    // Verify fields
    if (item.list_id !== listId) {
      throw new Error(
        `List ID mismatch: expected ${listId}, got ${item.list_id}`,
      );
    }
    if (item.content_id !== contentId) {
      throw new Error(
        `Content ID mismatch: expected ${contentId}, got ${item.content_id}`,
      );
    }
    if (item.position !== position) {
      throw new Error(
        `Position mismatch: expected ${position}, got ${item.position}`,
      );
    }

    return item.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ List item addition test failed:", message);
    throw error;
  }
}

async function testListOrdering(listId: string) {
  console.log("\nTesting list item ordering...");

  try {
    const result = await query<ListItem>(
      `
      SELECT * FROM list_items
      WHERE list_id = $1
      ORDER BY position ASC
    `,
      [listId],
    );

    console.log(`Found ${result.length} items in list:`);
    result.forEach((item, index) => {
      console.log(
        `  ${
          index + 1
        }. Position ${item.position} - Content ID: ${item.content_id}`,
      );
    });

    // Verify positions are sequential
    for (let i = 0; i < result.length; i++) {
      if (result[i].position !== i) {
        throw new Error(
          `Position mismatch at index ${i}: expected ${i}, got ${
            result[i].position
          }`,
        );
      }
    }

    console.log("✓ List ordering verified");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ List ordering test failed:", message);
    throw error;
  }
}

async function testUniqueConstraint(listId: string, contentId: string) {
  console.log("\nTesting unique constraint on (list_id, content_id)...");

  try {
    // Try to insert duplicate
    await query(
      `
      INSERT INTO list_items (list_id, content_id, position)
      VALUES ($1, $2, $3)
    `,
      [listId, contentId, 99],
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

async function testCascadeDelete(userId: string, listId: string) {
  console.log("\nTesting cascade delete behaviour...");

  try {
    // Count list_items before deletion
    const beforeCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM list_items WHERE list_id = $1`,
      [listId],
    );

    const countBefore = parseInt(beforeCount[0].count);
    console.log(`Found ${countBefore} list_item(s) before deletion`);

    if (countBefore === 0) {
      throw new Error(
        "Expected at least 1 list_item before deletion",
      );
    }

    // Delete the user (should cascade delete lists, which should cascade delete list_items)
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
    console.log("✓ User deleted");

    // Verify lists are deleted
    const listsAfter = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM lists WHERE user_id = $1`,
      [userId],
    );

    const listsCountAfter = parseInt(listsAfter[0].count);
    if (listsCountAfter !== 0) {
      throw new Error(
        `Expected 0 lists after user deletion, got ${listsCountAfter}`,
      );
    }

    // Verify list_items are deleted
    const itemsAfter = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM list_items WHERE list_id = $1`,
      [listId],
    );

    const itemsCountAfter = parseInt(itemsAfter[0].count);
    if (itemsCountAfter !== 0) {
      throw new Error(
        `Expected 0 list_items after user deletion, got ${itemsCountAfter}`,
      );
    }

    console.log("✓ Cascade delete from users table working correctly");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Cascade delete test failed:", message);
    throw error;
  }
}

async function main() {
  console.log("Lists Tables Migration Tests\n");
  console.log("=".repeat(50));

  try {
    await verifyTableStructure();

    const userId = await createTestUser();
    const listId = await testCreateList(
      userId,
      "80s Horror",
      "My favourite horror films from the 1980s",
      false,
    );

    const contentId1 = await createTestContent(1001, "The Shining");
    const contentId2 = await createTestContent(1002, "The Thing");
    const contentId3 = await createTestContent(1003, "Poltergeist");

    await testAddListItem(listId, contentId1, 0);
    await testAddListItem(listId, contentId2, 1);
    await testAddListItem(listId, contentId3, 2);

    await testListOrdering(listId);
    await testUniqueConstraint(listId, contentId1);

    // Create new user and list for cascade delete test
    const userId2 = await createTestUser();
    const listId2 = await testCreateList(userId2, "Test List", null, true);
    const contentId4 = await createTestContent(1004, "Test Movie");
    await testAddListItem(listId2, contentId4, 0);
    await testCascadeDelete(userId2, listId2);

    console.log("\n" + "=".repeat(50));
    console.log("✓ All lists tables tests passed!");
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("✗ Lists tables tests failed!");
    console.error(error);
    Deno.exit(1);
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  await main();
}
