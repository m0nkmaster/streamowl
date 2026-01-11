#!/usr/bin/env -S deno run -A

/**
 * Integration tests for critical user flows
 *
 * Tests:
 * 1. Signup flow - user registration and session creation
 * 2. Content discovery - search functionality
 * 3. Adding to watchlist - authenticated content management
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import type { HandlerContext } from "$fresh/server.ts";
import { handler as signupHandler } from "../routes/api/signup.ts";
import { handler as searchHandler } from "../routes/api/search.ts";
import { handler as watchlistHandler } from "../routes/api/content/[tmdb_id]/watchlist.ts";
import {
  CSRF_FIELD_NAME,
  generateCsrfToken,
  setCsrfCookie,
} from "../lib/security/csrf.ts";
import { query } from "../lib/db.ts";
import { createSessionToken } from "../lib/auth/jwt.ts";
import { setSessionCookie } from "../lib/auth/cookies.ts";

/**
 * Create a minimal Fresh context for testing
 */
function createTestContext(
  params: Record<string, string> = {},
): HandlerContext {
  return {
    params,
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 0 },
    url: new URL("http://localhost"),
    basePath: "",
    route: "",
    state: {},
    render: () => new Response(),
    renderNotFound: () => new Response(),
    renderError: () => new Response(),
    isPartial: false,
    destination: "route",
    pattern: "",
    name: "",
    data: undefined,
    config: {} as unknown,
    Component: () => null,
    next: () => new Response(),
  } as unknown as HandlerContext;
}

/**
 * Helper to create a test request with CSRF token
 */
function createRequestWithCsrf(
  url: string,
  method: string,
  body?: FormData,
): Request {
  const token = generateCsrfToken();
  const headers = new Headers();
  setCsrfCookie(headers, token);

  // Add CSRF token to form data if body exists
  if (body) {
    body.append(CSRF_FIELD_NAME, token);
  }

  // Extract cookies from Set-Cookie header
  const cookies: string[] = [];
  headers.forEach((value, key) => {
    if (key === "Set-Cookie") {
      cookies.push(value);
    }
  });

  const cookieHeader = cookies.join("; ");

  const requestHeaders = new Headers();
  if (cookieHeader) {
    requestHeaders.set("Cookie", cookieHeader);
  }
  requestHeaders.set("X-Forwarded-For", "127.0.0.1");

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: body,
  });
}

/**
 * Helper to create an authenticated request
 */
async function createAuthenticatedRequest(
  url: string,
  method: string,
  userId: string,
  email: string,
  body?: BodyInit,
): Promise<Request> {
  const token = await createSessionToken(userId, email);
  const headers = new Headers();
  setSessionCookie(headers, token);

  // Extract cookies from Set-Cookie header
  const cookies: string[] = [];
  headers.forEach((value, key) => {
    if (key === "Set-Cookie") {
      cookies.push(value);
    }
  });

  const cookieHeader = cookies.join("; ");

  const requestHeaders = new Headers();
  if (cookieHeader) {
    requestHeaders.set("Cookie", cookieHeader);
  }

  return new Request(url, {
    method,
    headers: requestHeaders,
    body: body,
  });
}

/**
 * Test 1: Signup flow
 * - Creates a new user account
 * - Verifies user is created in database
 * - Verifies session cookie is set
 * - Verifies redirect to dashboard
 */
async function testSignupFlow(): Promise<boolean> {
  console.log("Testing signup flow...");

  try {
    // Generate unique email for test
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "testpassword123";

    // Create signup request
    const formData = new FormData();
    formData.append("email", testEmail);
    formData.append("password", testPassword);

    const request = createRequestWithCsrf(
      "http://localhost/api/signup",
      "POST",
      formData,
    );

    // Call signup handler
    const ctx = createTestContext();
    const response = await signupHandler.POST?.(request, ctx) ||
      new Response("Handler not found", { status: 404 });

    // Verify response
    assertEquals(response.status, 303, "Signup should redirect");
    assertEquals(
      response.headers.get("Location"),
      "/dashboard",
      "Should redirect to dashboard",
    );

    // Verify session cookie is set
    const setCookieHeader = response.headers.get("Set-Cookie");
    assertExists(setCookieHeader, "Session cookie should be set");
    assertEquals(
      setCookieHeader?.includes("session_token"),
      true,
      "Cookie should contain session_token",
    );

    // Verify user exists in database
    const users = await query<{ id: string; email: string }>(
      "SELECT id, email FROM users WHERE email = $1",
      [testEmail.toLowerCase()],
    );

    assertEquals(users.length, 1, "User should be created");
    assertEquals(users[0].email, testEmail.toLowerCase(), "Email should match");

    // Clean up test user
    await query("DELETE FROM users WHERE email = $1", [
      testEmail.toLowerCase(),
    ]);

    console.log("✓ Signup flow test passed");
    return true;
  } catch (error) {
    console.error("✗ Signup flow test failed:", error);
    return false;
  }
}

/**
 * Test 2: Content discovery (search)
 * - Searches for content
 * - Verifies results are returned
 * - Verifies results contain expected fields
 */
async function testContentDiscovery(): Promise<boolean> {
  console.log("Testing content discovery (search)...");

  try {
    // Check for TMDB API key
    const apiKey = Deno.env.get("TMDB_API_KEY");
    if (!apiKey || apiKey === "your-tmdb-api-key-here") {
      console.log(
        "⚠ Skipping content discovery test - TMDB_API_KEY not set",
      );
      return true; // Skip but don't fail
    }

    // Create search request
    const request = new Request(
      "http://localhost/api/search?q=Inception&page=1",
      {
        method: "GET",
      },
    );

    // Call search handler
    const ctx = createTestContext();
    const response = await searchHandler.GET?.(request, ctx) ||
      new Response("Handler not found", { status: 404 });

    // Verify response
    assertEquals(response.status, 200, "Search should return 200");
    assertEquals(
      response.headers.get("Content-Type"),
      "application/json",
      "Should return JSON",
    );

    const data = await response.json();
    assertExists(data.results, "Results should exist");
    assertEquals(
      Array.isArray(data.results),
      true,
      "Results should be an array",
    );
    assertExists(data.total_results, "Total results should exist");
    assertExists(data.page, "Page should exist");

    // Verify result structure if results exist
    if (data.results.length > 0) {
      const firstResult = data.results[0];
      assertExists(firstResult.tmdb_id, "Result should have tmdb_id");
      assertExists(firstResult.title, "Result should have title");
      assertExists(firstResult.type, "Result should have type");
    }

    console.log("✓ Content discovery test passed");
    return true;
  } catch (error) {
    console.error("✗ Content discovery test failed:", error);
    return false;
  }
}

/**
 * Test 3: Adding to watchlist
 * - Creates a test user
 * - Adds content to watchlist
 * - Verifies content is added
 * - Verifies user_content record exists
 */
async function testAddToWatchlist(): Promise<boolean> {
  console.log("Testing adding to watchlist...");

  try {
    // Check for TMDB API key
    const apiKey = Deno.env.get("TMDB_API_KEY");
    if (!apiKey || apiKey === "your-tmdb-api-key-here") {
      console.log("⚠ Skipping watchlist test - TMDB_API_KEY not set");
      return true; // Skip but don't fail
    }

    // Create test user
    const testEmail = `test-watchlist-${Date.now()}@example.com`;
    const testPassword = "testpassword123";
    const { hashPassword } = await import("../lib/auth/password.ts");

    const passwordHash = await hashPassword(testPassword);
    const userResult = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      [testEmail.toLowerCase(), passwordHash],
    );

    const userId = userResult[0].id;

    try {
      // Use a known TMDB ID (Inception - movie ID 27205)
      const tmdbId = 27205;

      // Create authenticated request to add to watchlist
      const request = await createAuthenticatedRequest(
        `http://localhost/api/content/${tmdbId}/watchlist`,
        "POST",
        userId,
        testEmail,
      );

      // Call watchlist handler
      const ctx = createTestContext({ tmdb_id: tmdbId.toString() });
      const response = await watchlistHandler.POST?.(request, ctx) ||
        new Response("Handler not found", { status: 404 });

      // Verify response
      assertEquals(response.status, 200, "Should return 200");
      const data = await response.json();
      assertEquals(data.success, true, "Should indicate success");

      // Verify content was added to watchlist in database
      const watchlistItems = await query<{ id: string; status: string }>(
        `SELECT uc.id, uc.status 
         FROM user_content uc
         JOIN content c ON uc.content_id = c.id
         WHERE uc.user_id = $1 AND c.tmdb_id = $2 AND uc.status = 'to_watch'`,
        [userId, tmdbId],
      );

      assertEquals(
        watchlistItems.length,
        1,
        "Content should be in watchlist",
      );
      assertEquals(
        watchlistItems[0].status,
        "to_watch",
        "Status should be to_watch",
      );

      console.log("✓ Add to watchlist test passed");
      return true;
    } finally {
      // Clean up test data
      await query(
        `DELETE FROM user_content WHERE user_id = $1`,
        [userId],
      );
      await query("DELETE FROM users WHERE id = $1", [userId]);
    }
  } catch (error) {
    console.error("✗ Add to watchlist test failed:", error);
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("=".repeat(60));
  console.log("Integration Test Suite");
  console.log("=".repeat(60));
  console.log();

  // Check database connection
  try {
    await query("SELECT 1");
  } catch (_error) {
    console.error(
      "✗ Database connection failed. Please ensure DATABASE_URL is set.",
    );
    Deno.exit(1);
  }

  const results = [
    await testSignupFlow(),
    await testContentDiscovery(),
    await testAddToWatchlist(),
  ];

  console.log("\n" + "=".repeat(60));
  console.log("Test Results");
  console.log("=".repeat(60));
  const passed = results.filter((r) => r).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("✓ All integration tests passed!");
    Deno.exit(0);
  } else {
    console.log("✗ Some integration tests failed");
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
