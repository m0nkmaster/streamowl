/**
 * Test script for JWT session management
 *
 * Tests:
 * 1. Token creation and verification
 * 2. Invalid token rejection
 * 3. Expired token rejection
 * 4. Cookie setting and reading
 */

import { createSessionToken, verifySessionToken } from "../lib/auth/jwt.ts";
import {
  clearSessionCookie,
  getSessionToken,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "../lib/auth/cookies.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";

// Set test JWT secret
Deno.env.set("JWT_SECRET", "test-secret-key-for-testing-only");

console.log("🧪 Testing JWT Session Management\n");

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
  // Test 1: Token creation and verification
  await test("Create and verify valid token", async () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";
    const email = "test@example.com";
    const token = await createSessionToken(userId, email, 3600);

    if (!token || typeof token !== "string") {
      throw new Error("Token creation failed");
    }

    const payload = await verifySessionToken(token);
    if (payload.userId !== userId || payload.email !== email) {
      throw new Error("Token payload mismatch");
    }
    if (!payload.exp || !payload.iat) {
      throw new Error("Token missing expiration or issued at");
    }
  });

  // Test 2: Invalid token rejection
  await test("Reject invalid token", async () => {
    try {
      await verifySessionToken("invalid.token.here");
      throw new Error("Should have rejected invalid token");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Invalid")) {
        throw error;
      }
    }
  });

  // Test 3: Expired token rejection
  await test("Reject expired token", async () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";
    const email = "test@example.com";
    // Create token that expires immediately
    const token = await createSessionToken(userId, email, -1);

    // Wait a moment to ensure expiration
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      await verifySessionToken(token);
      throw new Error("Should have rejected expired token");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("expired")) {
        throw error;
      }
    }
  });

  // Test 4: Cookie setting
  test("Set session cookie in headers", () => {
    const headers = new Headers();
    const token = "test-token-123";
    setSessionCookie(headers, token);

    const cookieHeader = headers.get("Set-Cookie");
    if (!cookieHeader || !cookieHeader.includes(SESSION_COOKIE_NAME)) {
      throw new Error("Cookie not set correctly");
    }
    if (!cookieHeader.includes("HttpOnly")) {
      throw new Error("Cookie missing HttpOnly flag");
    }
    if (!cookieHeader.includes("SameSite=Lax")) {
      throw new Error("Cookie missing SameSite=Lax");
    }
  });

  // Test 5: Cookie reading
  test("Read session token from request cookies", () => {
    const request = new Request("https://example.com", {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=test-token-123; other=value`,
      },
    });

    const token = getSessionToken(request);
    if (token !== "test-token-123") {
      throw new Error("Failed to read session token from cookies");
    }
  });

  // Test 6: Cookie clearing
  test("Clear session cookie", () => {
    const headers = new Headers();
    clearSessionCookie(headers);

    const cookieHeader = headers.get("Set-Cookie");
    if (!cookieHeader || !cookieHeader.includes("Max-Age=0")) {
      throw new Error("Cookie not cleared correctly");
    }
  });

  // Test 7: Middleware session extraction
  await test("Extract session from request with valid token", async () => {
    const userId = "123e4567-e89b-12d3-a456-426614174000";
    const email = "test@example.com";
    const token = await createSessionToken(userId, email, 3600);

    const request = new Request("https://example.com", {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });

    const session = await getSessionFromRequest(request);
    if (!session || session.userId !== userId || session.email !== email) {
      throw new Error("Failed to extract session from request");
    }
  });

  // Test 8: Middleware rejects invalid token
  await test("Middleware rejects invalid token", async () => {
    const request = new Request("https://example.com", {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=invalid.token.here`,
      },
    });

    const session = await getSessionFromRequest(request);
    if (session !== null) {
      throw new Error("Should have rejected invalid token");
    }
  });

  // Test 9: Middleware handles missing cookie
  await test("Middleware handles missing cookie", async () => {
    const request = new Request("https://example.com");
    const session = await getSessionFromRequest(request);
    if (session !== null) {
      throw new Error("Should return null for missing cookie");
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    Deno.exit(1);
  }
}

runTests();
