/**
 * Test script for password hashing
 *
 * Tests:
 * 1. Password is hashed using bcrypt before storage
 * 2. Password hash stored in database is bcrypt format (not plaintext)
 * 3. Login works with correct password
 * 4. Login fails with incorrect password
 */

import { hashPassword, verifyPassword } from "../lib/auth/password.ts";
import { query, transaction } from "../lib/db.ts";

console.log("🧪 Testing Password Hashing\n");

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void> | void) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        console.log(`✅ ${name}`);
        passed++;
      }).catch((error) => {
        console.error(`❌ ${name}`);
        console.error(`   Error: ${error.message}`);
        failed++;
      });
    } else {
      console.log(`✅ ${name}`);
      passed++;
    }
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(
      `   Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    failed++;
  }
}

async function runTests() {
  const testEmail = `test-password-${Date.now()}@example.com`;
  const testPassword = "testpassword123";
  const wrongPassword = "wrongpassword456";

  // Test 1: Password hashing produces bcrypt hash
  await test("Password hashing produces bcrypt hash", async () => {
    const hash = await hashPassword(testPassword);

    // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
    if (
      !hash.startsWith("$2a$") && !hash.startsWith("$2b$") &&
      !hash.startsWith("$2y$")
    ) {
      throw new Error(
        `Hash does not appear to be bcrypt format: ${hash.substring(0, 10)}`,
      );
    }

    // Bcrypt hashes are typically 60 characters long
    if (hash.length < 50) {
      throw new Error(`Hash seems too short: ${hash.length} characters`);
    }

    // Hash should not be the plaintext password
    if (hash === testPassword) {
      throw new Error("Hash is the same as plaintext password");
    }
  });

  // Test 2: Create user and verify password is hashed in database
  await test("Password stored as bcrypt hash in database", async () => {
    const passwordHash = await hashPassword(testPassword);

    // Create user in database
    await transaction(async (client) => {
      await client.queryObject({
        text:
          "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
        args: [testEmail, passwordHash],
      });
    });

    // Query database for user record
    const users = await query<{
      id: string;
      email: string;
      password_hash: string;
    }>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [testEmail],
    );

    if (users.length === 0) {
      throw new Error("User not found in database");
    }

    const user = users[0];

    // Verify password_hash is bcrypt format, not plaintext
    if (user.password_hash === testPassword) {
      throw new Error("Password stored as plaintext in database");
    }

    if (
      !user.password_hash.startsWith("$2a$") &&
      !user.password_hash.startsWith("$2b$") &&
      !user.password_hash.startsWith("$2y$")
    ) {
      throw new Error(
        `Password hash is not bcrypt format: ${
          user.password_hash.substring(0, 20)
        }`,
      );
    }

    // Verify password verification works
    const isValid = await verifyPassword(testPassword, user.password_hash);
    if (!isValid) {
      throw new Error("Password verification failed with correct password");
    }
  });

  // Test 3: Verify login works with correct password
  await test("Login works with correct password", async () => {
    const users = await query<{
      id: string;
      email: string;
      password_hash: string;
    }>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [testEmail],
    );

    if (users.length === 0) {
      throw new Error("Test user not found");
    }

    const user = users[0];
    const isValid = await verifyPassword(testPassword, user.password_hash);

    if (!isValid) {
      throw new Error("Password verification failed with correct password");
    }
  });

  // Test 4: Verify login fails with incorrect password
  await test("Login fails with incorrect password", async () => {
    const users = await query<{
      id: string;
      email: string;
      password_hash: string;
    }>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [testEmail],
    );

    if (users.length === 0) {
      throw new Error("Test user not found");
    }

    const user = users[0];
    const isValid = await verifyPassword(wrongPassword, user.password_hash);

    if (isValid) {
      throw new Error(
        "Password verification should have failed with incorrect password",
      );
    }
  });

  // Cleanup: Delete test user
  await test("Cleanup test user", async () => {
    await query("DELETE FROM users WHERE email = $1", [testEmail]);
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    Deno.exit(1);
  }
}

runTests();
