/**
 * Unit tests for JWT signing and verification utilities
 */

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  createSessionToken,
  type SessionPayload as _SessionPayload,
  verifySessionToken,
} from "./jwt.ts";

// Set up test JWT secret
const TEST_JWT_SECRET = "test-secret-key-for-unit-tests-only";

Deno.test("createSessionToken should create a valid JWT token", async () => {
  // Set environment variable for test
  Deno.env.set("JWT_SECRET", TEST_JWT_SECRET);

  const userId = "test-user-id";
  const email = "test@example.com";
  const token = await createSessionToken(userId, email);

  assert(token.length > 0);
  // JWT tokens have three parts separated by dots
  const parts = token.split(".");
  assertEquals(parts.length, 3);
});

Deno.test("verifySessionToken should decode valid token", async () => {
  Deno.env.set("JWT_SECRET", TEST_JWT_SECRET);

  const userId = "test-user-id";
  const email = "test@example.com";
  const token = await createSessionToken(userId, email);

  const payload = await verifySessionToken(token);

  assertEquals(payload.userId, userId);
  assertEquals(payload.email, email);
  assert(typeof payload.iat === "number");
  assert(typeof payload.exp === "number");
});

Deno.test("verifySessionToken should reject invalid token", async () => {
  Deno.env.set("JWT_SECRET", TEST_JWT_SECRET);

  const invalidToken = "invalid.token.here";

  try {
    await verifySessionToken(invalidToken);
    assert(false, "Should have thrown an error");
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message.includes("Invalid"));
  }
});

Deno.test("verifySessionToken should reject token signed with different secret", async () => {
  Deno.env.set("JWT_SECRET", TEST_JWT_SECRET);

  const userId = "test-user-id";
  const email = "test@example.com";
  const token = await createSessionToken(userId, email);

  // Change secret
  Deno.env.set("JWT_SECRET", "different-secret");

  try {
    await verifySessionToken(token);
    assert(false, "Should have thrown an error");
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message.includes("Invalid"));
  } finally {
    // Restore original secret
    Deno.env.set("JWT_SECRET", TEST_JWT_SECRET);
  }
});

Deno.test("createSessionToken should use custom expiration", async () => {
  Deno.env.set("JWT_SECRET", TEST_JWT_SECRET);

  const userId = "test-user-id";
  const email = "test@example.com";
  const expiresInSeconds = 3600; // 1 hour
  const token = await createSessionToken(userId, email, expiresInSeconds);

  const payload = await verifySessionToken(token);
  assert(payload.exp !== undefined);
  assert(payload.iat !== undefined);

  // Check expiration is approximately 1 hour from now
  const now = Math.floor(Date.now() / 1000);
  const expectedExp = now + expiresInSeconds;
  const diff = Math.abs(payload.exp! - expectedExp);
  // Allow 5 second tolerance
  assert(diff < 5);
});

Deno.test("createSessionToken should throw error when JWT_SECRET not set", async () => {
  // Remove JWT_SECRET
  Deno.env.delete("JWT_SECRET");

  try {
    await createSessionToken("test-user-id", "test@example.com");
    assert(false, "Should have thrown an error");
  } catch (error) {
    assert(error instanceof Error);
    assert(error.message.includes("JWT_SECRET"));
  } finally {
    // Restore for other tests
    Deno.env.set("JWT_SECRET", TEST_JWT_SECRET);
  }
});
