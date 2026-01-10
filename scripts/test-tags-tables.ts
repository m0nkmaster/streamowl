#!/usr/bin/env -S deno run -A

/**
 * Test script for tags and content_tags tables migration
 *
 * Tests:
 * 1. Verify tables exist with correct columns
 * 2. Test creating tags with user_id, name, and colour
 * 3. Test applying multiple tags to content
 * 4. Test unique constraint on user_id + tag name
 * 5. Test foreign key constraints
 * 6. Test cascade delete behaviour
 */

import { closePool, query } from "../lib/db.ts";

interface Tag {
  id: string;
  user_id: string;
  name: string;
  colour: string;
  created_at: Date;
  updated_at: Date;
}

interface ContentTag {
  id: string;
  tag_id: string;
  content_id: string;
  created_at: Date;
}

async function verifyTableStructure() {
  console.log("Verifying tags table structure...");

  try {
    // Check tags table
    const tagsResult = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      udt_name: string;
    }>(`
      SELECT column_name, data_type, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_name = 'tags'
      ORDER BY ordinal_position
    `);

    const expectedTagsColumns = [
      { name: "id", type: "uuid" },
      { name: "user_id", type: "uuid" },
      { name: "name", type: "character varying" },
      { name: "colour", type: "character varying" },
      { name: "created_at", type: "timestamp with time zone" },
      { name: "updated_at", type: "timestamp with time zone" },
    ];

    console.log(`Found ${tagsResult.length} columns in tags table:`);
    tagsResult.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const foundTagsColumns = new Set(tagsResult.map((r) => r.column_name));
    const missingTagsColumns = expectedTagsColumns.filter(
      (ec) => !foundTagsColumns.has(ec.name),
    );

    if (missingTagsColumns.length > 0) {
      throw new Error(
        `Missing columns in tags table: ${
          missingTagsColumns.map((c) => c.name).join(", ")
        }`,
      );
    }

    // Check content_tags table
    const contentTagsResult = await query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      udt_name: string;
    }>(`
      SELECT column_name, data_type, is_nullable, udt_name
      FROM information_schema.columns
      WHERE table_name = 'content_tags'
      ORDER BY ordinal_position
    `);

    const expectedContentTagsColumns = [
      { name: "id", type: "uuid" },
      { name: "tag_id", type: "uuid" },
      { name: "content_id", type: "uuid" },
      { name: "created_at", type: "timestamp with time zone" },
    ];

    console.log(
      `\nFound ${contentTagsResult.length} columns in content_tags table:`,
    );
    contentTagsResult.forEach((col) => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const foundContentTagsColumns = new Set(
      contentTagsResult.map((r) => r.column_name),
    );
    const missingContentTagsColumns = expectedContentTagsColumns.filter(
      (ec) => !foundContentTagsColumns.has(ec.name),
    );

    if (missingContentTagsColumns.length > 0) {
      throw new Error(
        `Missing columns in content_tags table: ${
          missingContentTagsColumns.map((c) => c.name).join(", ")
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
        AND (tc.table_name = 'tags' OR tc.table_name = 'content_tags')
      ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
    `);

    console.log(`\nFound ${fkResult.length} foreign key constraint(s):`);
    fkResult.forEach((fk) => {
      console.log(
        `  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`,
      );
    });

    // Verify tags.user_id foreign key
    const tagsUserFk = fkResult.find(
      (fk) => fk.table_name === "tags" && fk.column_name === "user_id",
    );
    if (!tagsUserFk || tagsUserFk.foreign_table_name !== "users") {
      throw new Error("Missing or incorrect foreign key for tags.user_id");
    }
    if (tagsUserFk.delete_rule !== "CASCADE") {
      throw new Error(
        `tags.user_id foreign key should have CASCADE delete, got ${tagsUserFk.delete_rule}`,
      );
    }

    // Verify content_tags.tag_id foreign key
    const contentTagsTagFk = fkResult.find(
      (fk) => fk.table_name === "content_tags" && fk.column_name === "tag_id",
    );
    if (!contentTagsTagFk || contentTagsTagFk.foreign_table_name !== "tags") {
      throw new Error(
        "Missing or incorrect foreign key for content_tags.tag_id",
      );
    }
    if (contentTagsTagFk.delete_rule !== "CASCADE") {
      throw new Error(
        `content_tags.tag_id foreign key should have CASCADE delete, got ${contentTagsTagFk.delete_rule}`,
      );
    }

    // Verify content_tags.content_id foreign key
    const contentTagsContentFk = fkResult.find(
      (fk) =>
        fk.table_name === "content_tags" && fk.column_name === "content_id",
    );
    if (
      !contentTagsContentFk ||
      contentTagsContentFk.foreign_table_name !== "content"
    ) {
      throw new Error(
        "Missing or incorrect foreign key for content_tags.content_id",
      );
    }
    if (contentTagsContentFk.delete_rule !== "CASCADE") {
      throw new Error(
        `content_tags.content_id foreign key should have CASCADE delete, got ${contentTagsContentFk.delete_rule}`,
      );
    }

    // Verify unique constraint on (user_id, name) for tags
    const tagsUniqueResult = await query<{
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
        AND tc.table_name = 'tags'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);

    const tagsUniqueColumns = tagsUniqueResult
      .filter((u) => u.constraint_name !== "tags_pkey") // Exclude primary key
      .map((u) => u.column_name);

    console.log(
      `\nFound unique constraint columns in tags: ${
        tagsUniqueColumns.join(", ")
      }`,
    );

    if (
      !tagsUniqueColumns.includes("user_id") ||
      !tagsUniqueColumns.includes("name")
    ) {
      throw new Error(
        "Missing unique constraint on tags (user_id, name)",
      );
    }

    // Verify unique constraint on (tag_id, content_id) for content_tags
    const contentTagsUniqueResult = await query<{
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
        AND tc.table_name = 'content_tags'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `);

    const contentTagsUniqueColumns = contentTagsUniqueResult
      .filter((u) => u.constraint_name !== "content_tags_pkey") // Exclude primary key
      .map((u) => u.column_name);

    console.log(
      `\nFound unique constraint columns in content_tags: ${
        contentTagsUniqueColumns.join(", ")
      }`,
    );

    if (
      !contentTagsUniqueColumns.includes("tag_id") ||
      !contentTagsUniqueColumns.includes("content_id")
    ) {
      throw new Error(
        "Missing unique constraint on content_tags (tag_id, content_id)",
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
      ["test-tags@example.com", "Test Tags User"],
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

async function testCreateTag(
  userId: string,
  name: string,
  colour: string,
) {
  console.log(`\nTesting tag creation: ${name}...`);

  try {
    const result = await query<Tag>(
      `
      INSERT INTO tags (user_id, name, colour)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [userId, name, colour],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 tag created, got " + result.length);
    }

    const tag = result[0];
    console.log("✓ Tag created successfully:");
    console.log(`  ID: ${tag.id}`);
    console.log(`  User ID: ${tag.user_id}`);
    console.log(`  Name: ${tag.name}`);
    console.log(`  Colour: ${tag.colour}`);

    // Verify fields
    if (tag.user_id !== userId) {
      throw new Error(
        `User ID mismatch: expected ${userId}, got ${tag.user_id}`,
      );
    }
    if (tag.name !== name) {
      throw new Error(`Name mismatch: expected ${name}, got ${tag.name}`);
    }
    if (tag.colour !== colour) {
      throw new Error(
        `Colour mismatch: expected ${colour}, got ${tag.colour}`,
      );
    }

    return tag.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Tag creation test failed:", message);
    throw error;
  }
}

async function testApplyTagToContent(tagId: string, contentId: string) {
  console.log(`\nTesting applying tag to content...`);

  try {
    const result = await query<ContentTag>(
      `
      INSERT INTO content_tags (tag_id, content_id)
      VALUES ($1, $2)
      RETURNING *
    `,
      [tagId, contentId],
    );

    if (result.length !== 1) {
      throw new Error("Expected 1 content_tag created, got " + result.length);
    }

    const contentTag = result[0];
    console.log("✓ Tag applied to content successfully:");
    console.log(`  ID: ${contentTag.id}`);
    console.log(`  Tag ID: ${contentTag.tag_id}`);
    console.log(`  Content ID: ${contentTag.content_id}`);

    // Verify fields
    if (contentTag.tag_id !== tagId) {
      throw new Error(
        `Tag ID mismatch: expected ${tagId}, got ${contentTag.tag_id}`,
      );
    }
    if (contentTag.content_id !== contentId) {
      throw new Error(
        `Content ID mismatch: expected ${contentId}, got ${contentTag.content_id}`,
      );
    }

    return contentTag.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Apply tag test failed:", message);
    throw error;
  }
}

async function testMultipleTagsOnContent(contentId: string, tagIds: string[]) {
  console.log(`\nTesting applying multiple tags to content...`);

  try {
    // Apply all tags
    for (const tagId of tagIds) {
      await testApplyTagToContent(tagId, contentId);
    }

    // Verify all tags are applied
    const result = await query<ContentTag>(
      `
      SELECT * FROM content_tags
      WHERE content_id = $1
      ORDER BY created_at ASC
    `,
      [contentId],
    );

    console.log(`Found ${result.length} tag(s) applied to content:`);
    result.forEach((ct, index) => {
      console.log(`  ${index + 1}. Tag ID: ${ct.tag_id}`);
    });

    if (result.length !== tagIds.length) {
      throw new Error(
        `Expected ${tagIds.length} tags, got ${result.length}`,
      );
    }

    const appliedTagIds = new Set(result.map((r) => r.tag_id));
    for (const tagId of tagIds) {
      if (!appliedTagIds.has(tagId)) {
        throw new Error(`Tag ${tagId} not found in applied tags`);
      }
    }

    console.log("✓ Multiple tags applied successfully");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("✗ Multiple tags test failed:", message);
    throw error;
  }
}

async function testUniqueConstraintOnTagName(userId: string, tagName: string) {
  console.log(`\nTesting unique constraint on (user_id, tag name)...`);

  try {
    // Try to create duplicate tag name for same user
    await query(
      `
      INSERT INTO tags (user_id, name, colour)
      VALUES ($1, $2, $3)
    `,
      [userId, tagName, "#FF0000"],
    );

    throw new Error(
      "Expected unique constraint violation, but insert succeeded",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unique") || message.includes("duplicate")) {
      console.log(
        "✓ Unique constraint working correctly (duplicate tag name rejected)",
      );
      return true;
    }
    throw error;
  }
}

async function testUniqueConstraintOnContentTag(
  tagId: string,
  contentId: string,
) {
  console.log(`\nTesting unique constraint on (tag_id, content_id)...`);

  try {
    // Try to insert duplicate
    await query(
      `
      INSERT INTO content_tags (tag_id, content_id)
      VALUES ($1, $2)
    `,
      [tagId, contentId],
    );

    throw new Error(
      "Expected unique constraint violation, but insert succeeded",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unique") || message.includes("duplicate")) {
      console.log(
        "✓ Unique constraint working correctly (duplicate content_tag rejected)",
      );
      return true;
    }
    throw error;
  }
}

async function testCascadeDelete(userId: string, tagId: string) {
  console.log("\nTesting cascade delete behaviour...");

  try {
    // Count content_tags before deletion
    const beforeCount = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM content_tags WHERE tag_id = $1`,
      [tagId],
    );

    const countBefore = parseInt(beforeCount[0].count);
    console.log(`Found ${countBefore} content_tag(s) before deletion`);

    if (countBefore === 0) {
      throw new Error(
        "Expected at least 1 content_tag before deletion",
      );
    }

    // Delete the user (should cascade delete tags, which should cascade delete content_tags)
    await query(`DELETE FROM users WHERE id = $1`, [userId]);
    console.log("✓ User deleted");

    // Verify tags are deleted
    const tagsAfter = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM tags WHERE user_id = $1`,
      [userId],
    );

    const tagsCountAfter = parseInt(tagsAfter[0].count);
    if (tagsCountAfter !== 0) {
      throw new Error(
        `Expected 0 tags after user deletion, got ${tagsCountAfter}`,
      );
    }

    // Verify content_tags are deleted
    const contentTagsAfter = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM content_tags WHERE tag_id = $1`,
      [tagId],
    );

    const contentTagsCountAfter = parseInt(contentTagsAfter[0].count);
    if (contentTagsCountAfter !== 0) {
      throw new Error(
        `Expected 0 content_tags after user deletion, got ${contentTagsCountAfter}`,
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
  console.log("Tags Tables Migration Tests\n");
  console.log("=".repeat(50));

  try {
    await verifyTableStructure();

    const userId = await createTestUser();
    const tagId1 = await testCreateTag(userId, "Comfort Watch", "#3B82F6");
    const tagId2 = await testCreateTag(userId, "Action", "#EF4444");
    const tagId3 = await testCreateTag(userId, "Sci-Fi", "#10B981");

    const contentId1 = await createTestContent(2001, "The Matrix");

    // Test applying multiple tags to a single content item
    await testMultipleTagsOnContent(contentId1, [tagId1, tagId2, tagId3]);

    // Test unique constraint on tag name
    await testUniqueConstraintOnTagName(userId, "Comfort Watch");

    // Test unique constraint on content_tags
    await testUniqueConstraintOnContentTag(tagId1, contentId1);

    // Create new user and tags for cascade delete test
    const userId2 = await createTestUser();
    const tagId4 = await testCreateTag(userId2, "Horror", "#8B5CF6");
    const contentId3 = await createTestContent(2003, "The Exorcist");
    await testApplyTagToContent(tagId4, contentId3);
    await testCascadeDelete(userId2, tagId4);

    console.log("\n" + "=".repeat(50));
    console.log("✓ All tags tables tests passed!");
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("✗ Tags tables tests failed!");
    console.error(error);
    Deno.exit(1);
  } finally {
    await closePool();
  }
}

if (import.meta.main) {
  await main();
}
