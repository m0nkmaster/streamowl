/**
 * Test script to verify CSRF protection is working correctly
 *
 * Tests:
 * 1. Form submission without CSRF token is rejected
 * 2. Form submission with invalid CSRF token is rejected
 * 3. Form submission with valid CSRF token succeeds
 */

const BASE_URL = Deno.env.get("BASE_URL") || "http://localhost:8000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Test helper to make HTTP requests
 */
async function makeRequest(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...options.headers,
    },
  });
  return response;
}

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
 * Test 1: Form submission without CSRF token should be rejected
 */
async function testMissingCsrfToken(): Promise<void> {
  console.log("Test 1: Submitting form without CSRF token...");

  const formData = new URLSearchParams({
    email: "test@example.com",
    password: "testpassword123",
  });

  const response = await makeRequest(`${BASE_URL}/api/login`, {
    method: "POST",
    body: formData.toString(),
  });

  if (response.status === 403) {
    const body = await response.json();
    if (body.error === "Invalid CSRF token") {
      results.push({ name: "Missing CSRF token rejected", passed: true });
      console.log("✓ Passed: Request without CSRF token correctly rejected");
    } else {
      results.push({
        name: "Missing CSRF token rejected",
        passed: false,
        error: `Unexpected error message: ${body.error}`,
      });
      console.log("✗ Failed: Wrong error message");
    }
  } else {
    results.push({
      name: "Missing CSRF token rejected",
      passed: false,
      error: `Expected 403, got ${response.status}`,
    });
    console.log(`✗ Failed: Expected 403, got ${response.status}`);
  }
}

/**
 * Test 2: Form submission with invalid CSRF token should be rejected
 */
async function testInvalidCsrfToken(): Promise<void> {
  console.log("\nTest 2: Submitting form with invalid CSRF token...");

  // First, get a CSRF token by visiting the login page
  const loginPageResponse = await makeRequest(`${BASE_URL}/login`);
  const csrfCookie = extractCsrfTokenFromCookie(
    loginPageResponse.headers.get("Set-Cookie"),
  );

  if (!csrfCookie) {
    results.push({
      name: "Invalid CSRF token rejected",
      passed: false,
      error: "Could not extract CSRF token from login page",
    });
    console.log("✗ Failed: Could not get CSRF token");
    return;
  }

  // Submit form with invalid CSRF token (different from cookie)
  const formData = new URLSearchParams({
    email: "test@example.com",
    password: "testpassword123",
    csrf_token: "invalid_token_12345",
  });

  const response = await makeRequest(`${BASE_URL}/api/login`, {
    method: "POST",
    body: formData.toString(),
    headers: {
      Cookie: `csrf_token=${csrfCookie}`,
    },
  });

  if (response.status === 403) {
    const body = await response.json();
    if (body.error === "Invalid CSRF token") {
      results.push({ name: "Invalid CSRF token rejected", passed: true });
      console.log("✓ Passed: Request with invalid CSRF token correctly rejected");
    } else {
      results.push({
        name: "Invalid CSRF token rejected",
        passed: false,
        error: `Unexpected error message: ${body.error}`,
      });
      console.log("✗ Failed: Wrong error message");
    }
  } else {
    results.push({
      name: "Invalid CSRF token rejected",
      passed: false,
      error: `Expected 403, got ${response.status}`,
    });
    console.log(`✗ Failed: Expected 403, got ${response.status}`);
  }
}

/**
 * Test 3: Form submission with valid CSRF token should succeed (or fail with auth error, not CSRF error)
 */
async function testValidCsrfToken(): Promise<void> {
  console.log("\nTest 3: Submitting form with valid CSRF token...");

  // First, get a CSRF token by visiting the login page
  const loginPageResponse = await makeRequest(`${BASE_URL}/login`);
  const csrfCookie = extractCsrfTokenFromCookie(
    loginPageResponse.headers.get("Set-Cookie"),
  );

  if (!csrfCookie) {
    results.push({
      name: "Valid CSRF token accepted",
      passed: false,
      error: "Could not extract CSRF token from login page",
    });
    console.log("✗ Failed: Could not get CSRF token");
    return;
  }

  // Submit form with valid CSRF token (matches cookie)
  const formData = new URLSearchParams({
    email: "test@example.com",
    password: "testpassword123",
    csrf_token: csrfCookie,
  });

  const response = await makeRequest(`${BASE_URL}/api/login`, {
    method: "POST",
    body: formData.toString(),
    headers: {
      Cookie: `csrf_token=${csrfCookie}`,
    },
  });

  // Should not be a CSRF error (could be 401 for invalid credentials, which is fine)
  if (response.status === 403) {
    const body = await response.json();
    if (body.error === "Invalid CSRF token") {
      results.push({
        name: "Valid CSRF token accepted",
        passed: false,
        error: "Valid CSRF token was incorrectly rejected",
      });
      console.log("✗ Failed: Valid CSRF token was rejected");
    } else {
      // Some other 403 error, not CSRF related
      results.push({
        name: "Valid CSRF token accepted",
        passed: true,
      });
      console.log("✓ Passed: CSRF token validated (got non-CSRF error)");
    }
  } else {
    // Not a CSRF error, which means CSRF validation passed
    results.push({ name: "Valid CSRF token accepted", passed: true });
    console.log(
      `✓ Passed: CSRF token validated (got ${response.status}, not CSRF error)`,
    );
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log("Testing CSRF Protection\n");
  console.log("=" .repeat(50));

  try {
    await testMissingCsrfToken();
    await testInvalidCsrfToken();
    await testValidCsrfToken();

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
