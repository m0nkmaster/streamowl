/**
 * Test script to verify rate limiting on authentication endpoints
 *
 * Tests:
 * 1. Attempt 10 failed logins in rapid succession
 * 2. Verify rate limit kicks in (11th attempt blocked)
 * 3. Verify error message indicates rate limiting
 * 4. Wait and verify access restored after cooldown
 */

const BASE_URL = Deno.env.get("BASE_URL") || "http://localhost:8000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Extract CSRF token from Set-Cookie header
 */
function extractCsrfTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(", ");
  const csrfCookie = cookies.find((c) => c.startsWith("csrf_token="));
  if (!csrfCookie) return null;
  return csrfCookie.split("=")[1].split(";")[0];
}

/**
 * Get CSRF token from login page
 */
async function getCsrfToken(): Promise<string | null> {
  const response = await fetch(`${BASE_URL}/login`);
  return extractCsrfTokenFromCookie(response.headers.get("Set-Cookie"));
}

/**
 * Make a failed login attempt
 */
async function makeFailedLoginAttempt(
  csrfToken: string,
  csrfCookie: string,
): Promise<Response> {
  const formData = new URLSearchParams({
    email: "nonexistent@example.com",
    password: "wrongpassword",
    csrf_token: csrfToken,
  });

  return await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `csrf_token=${csrfCookie}`,
    },
    body: formData.toString(),
  });
}

/**
 * Test 1: Attempt 10 failed logins and verify rate limit kicks in
 */
async function testRateLimitActivation(): Promise<void> {
  console.log("Test 1: Attempting 10 failed logins in rapid succession...");

  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    results.push({
      name: "Rate limit activation",
      passed: false,
      error: "Could not get CSRF token",
    });
    console.log("✗ Failed: Could not get CSRF token");
    return;
  }

  const csrfCookie = csrfToken;

  // Make 10 failed login attempts
  const attempts: Response[] = [];
  for (let i = 0; i < 10; i++) {
    const response = await makeFailedLoginAttempt(csrfToken, csrfCookie);
    attempts.push(response);
    // Small delay to ensure requests are processed
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Verify all 10 attempts failed with 401
  const allFailed = attempts.every((r) => r.status === 401);
  if (!allFailed) {
    results.push({
      name: "Rate limit activation",
      passed: false,
      error: "Not all initial attempts failed with 401",
    });
    console.log("✗ Failed: Not all initial attempts failed with 401");
    return;
  }

  // 11th attempt should be rate limited
  const rateLimitedResponse = await makeFailedLoginAttempt(csrfToken, csrfCookie);

  if (rateLimitedResponse.status === 429) {
    const body = await rateLimitedResponse.json();
    if (
      body.error &&
      body.error.includes("Too many failed login attempts")
    ) {
      results.push({ name: "Rate limit activation", passed: true });
      console.log("✓ Passed: Rate limit correctly activated after 10 failed attempts");
    } else {
      results.push({
        name: "Rate limit activation",
        passed: false,
        error: `Unexpected error message: ${body.error}`,
      });
      console.log("✗ Failed: Wrong error message");
    }
  } else {
    results.push({
      name: "Rate limit activation",
      passed: false,
      error: `Expected 429, got ${rateLimitedResponse.status}`,
    });
    console.log(
      `✗ Failed: Expected 429, got ${rateLimitedResponse.status}`,
    );
  }
}

/**
 * Test 2: Verify error message indicates rate limiting
 */
async function testRateLimitErrorMessage(): Promise<void> {
  console.log("\nTest 2: Verifying rate limit error message...");

  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    results.push({
      name: "Rate limit error message",
      passed: false,
      error: "Could not get CSRF token",
    });
    console.log("✗ Failed: Could not get CSRF token");
    return;
  }

  const csrfCookie = csrfToken;

  // Make 10 failed attempts to trigger rate limit
  for (let i = 0; i < 10; i++) {
    await makeFailedLoginAttempt(csrfToken, csrfCookie);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Make one more attempt to get rate limit response
  const response = await makeFailedLoginAttempt(csrfToken, csrfCookie);
  const body = await response.json();

  if (
    response.status === 429 &&
    body.error &&
    body.error.includes("Too many failed login attempts") &&
    body.rateLimitExceeded === true &&
    typeof body.remainingSeconds === "number"
  ) {
    results.push({ name: "Rate limit error message", passed: true });
    console.log("✓ Passed: Error message correctly indicates rate limiting");
    console.log(`  Remaining seconds: ${body.remainingSeconds}`);
  } else {
    results.push({
      name: "Rate limit error message",
      passed: false,
      error: `Unexpected response: ${JSON.stringify(body)}`,
    });
    console.log("✗ Failed: Error message does not match expected format");
  }
}

/**
 * Test 3: Wait and verify access restored after cooldown
 */
async function testRateLimitCooldown(): Promise<void> {
  console.log("\nTest 3: Testing rate limit cooldown period...");

  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    results.push({
      name: "Rate limit cooldown",
      passed: false,
      error: "Could not get CSRF token",
    });
    console.log("✗ Failed: Could not get CSRF token");
    return;
  }

  const csrfCookie = csrfToken;

  // Make 10 failed attempts to trigger rate limit
  for (let i = 0; i < 10; i++) {
    await makeFailedLoginAttempt(csrfToken, csrfCookie);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Verify rate limited
  const rateLimitedResponse = await makeFailedLoginAttempt(csrfToken, csrfCookie);
  const rateLimitedBody = await rateLimitedResponse.json();

  if (rateLimitedResponse.status !== 429) {
    results.push({
      name: "Rate limit cooldown",
      passed: false,
      error: "Rate limit not activated",
    });
    console.log("✗ Failed: Rate limit not activated");
    return;
  }

  const remainingSeconds = rateLimitedBody.remainingSeconds;
  console.log(
    `  Rate limit active. Waiting ${remainingSeconds} seconds for cooldown...`,
  );

  // Wait for cooldown period (add 1 second buffer)
  await new Promise((resolve) =>
    setTimeout(resolve, (remainingSeconds + 1) * 1000)
  );

  // After cooldown, should be able to make attempts again
  // Note: We'll still get 401 for wrong password, but not 429 for rate limit
  const afterCooldownResponse = await makeFailedLoginAttempt(
    csrfToken,
    csrfCookie,
  );

  if (afterCooldownResponse.status === 401) {
    // Rate limit cleared, but still wrong password (expected)
    results.push({ name: "Rate limit cooldown", passed: true });
    console.log(
      "✓ Passed: Access restored after cooldown (401 = auth failed, not rate limited)",
    );
  } else if (afterCooldownResponse.status === 429) {
    results.push({
      name: "Rate limit cooldown",
      passed: false,
      error: "Still rate limited after cooldown period",
    });
    console.log("✗ Failed: Still rate limited after cooldown");
  } else {
    results.push({
      name: "Rate limit cooldown",
      passed: false,
      error: `Unexpected status: ${afterCooldownResponse.status}`,
    });
    console.log(
      `✗ Failed: Unexpected status ${afterCooldownResponse.status}`,
    );
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log("Testing Rate Limiting on Authentication Endpoints\n");
  console.log("=".repeat(50));

  try {
    await testRateLimitActivation();
    await testRateLimitErrorMessage();
    await testRateLimitCooldown();

    console.log("\n" + "=".repeat(50));
    console.log("\nTest Results Summary:");
    console.log("=".repeat(50));

    let passed = 0;
    let failed = 0;

    for (const result of results) {
      if (result.passed) {
        console.log(`✓ ${result.name}`);
        passed++;
      } else {
        console.log(`✗ ${result.name}`);
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
        failed++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`Total: ${results.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      Deno.exit(1);
    }
  } catch (error) {
    console.error("\nTest execution failed:", error);
    Deno.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.main) {
  await runTests();
}
