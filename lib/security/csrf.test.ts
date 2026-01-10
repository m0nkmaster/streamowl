/**
 * Unit tests for CSRF token generation and validation utilities
 */

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  createCsrfErrorResponse,
  CSRF_COOKIE_NAME,
  CSRF_FIELD_NAME,
  generateCsrfToken,
  getCsrfTokenFromCookie,
  getCsrfTokenFromForm,
  getCsrfTokenFromJson,
  setCsrfCookie,
  validateCsrfToken,
  validateCsrfTokenFromJson,
} from "./csrf.ts";

Deno.test("generateCsrfToken should generate a random token", () => {
  const token1 = generateCsrfToken();
  const token2 = generateCsrfToken();

  // Tokens should be different
  assert(token1 !== token2);
  // Tokens should be reasonable length (base64 of 32 bytes = 44 chars, minus padding)
  assert(token1.length >= 40);
  assert(token1.length <= 44);
});

Deno.test("generateCsrfToken should generate URL-safe tokens", () => {
  const token = generateCsrfToken();
  // Should not contain +, /, or = (replaced with -, _, and removed)
  assert(!token.includes("+"));
  assert(!token.includes("/"));
  assert(!token.includes("="));
});

Deno.test("setCsrfCookie should set cookie in headers", () => {
  const headers = new Headers();
  const token = generateCsrfToken();

  setCsrfCookie(headers, token);

  const cookieHeader = headers.get("Set-Cookie");
  assert(cookieHeader !== null);
  assert(cookieHeader!.includes(`${CSRF_COOKIE_NAME}=${token}`));
  assert(cookieHeader!.includes("HttpOnly"));
  assert(cookieHeader!.includes("SameSite=Lax"));
});

Deno.test("getCsrfTokenFromCookie should extract token from cookie header", () => {
  const token = generateCsrfToken();
  const headers = new Headers();
  headers.set("Cookie", `${CSRF_COOKIE_NAME}=${token}; other=value`);

  const request = new Request("https://example.com", { headers });
  const extracted = getCsrfTokenFromCookie(request);

  assertEquals(extracted, token);
});

Deno.test("getCsrfTokenFromCookie should return undefined when cookie not present", () => {
  const request = new Request("https://example.com");
  const extracted = getCsrfTokenFromCookie(request);

  assertEquals(extracted, undefined);
});

Deno.test("getCsrfTokenFromForm should extract token from FormData", () => {
  const token = generateCsrfToken();
  const formData = new FormData();
  formData.set(CSRF_FIELD_NAME, token);
  formData.set("other", "value");

  const extracted = getCsrfTokenFromForm(formData);
  assertEquals(extracted, token);
});

Deno.test("getCsrfTokenFromForm should return undefined when token not present", () => {
  const formData = new FormData();
  formData.set("other", "value");

  const extracted = getCsrfTokenFromForm(formData);
  assertEquals(extracted, undefined);
});

Deno.test("getCsrfTokenFromJson should extract token from JSON object", () => {
  const token = generateCsrfToken();
  const jsonBody = {
    [CSRF_FIELD_NAME]: token,
    other: "value",
  };

  const extracted = getCsrfTokenFromJson(jsonBody);
  assertEquals(extracted, token);
});

Deno.test("getCsrfTokenFromJson should return undefined when token not present", () => {
  const jsonBody = {
    other: "value",
  };

  const extracted = getCsrfTokenFromJson(jsonBody);
  assertEquals(extracted, undefined);
});

Deno.test("getCsrfTokenFromJson should return undefined for non-string token", () => {
  const jsonBody = {
    [CSRF_FIELD_NAME]: 123,
  };

  const extracted = getCsrfTokenFromJson(jsonBody);
  assertEquals(extracted, undefined);
});

Deno.test("validateCsrfTokenFromJson should return true for matching tokens", () => {
  const token = generateCsrfToken();
  const headers = new Headers();
  headers.set("Cookie", `${CSRF_COOKIE_NAME}=${token}`);
  const request = new Request("https://example.com", { headers });

  const jsonBody = {
    [CSRF_FIELD_NAME]: token,
  };

  const isValid = validateCsrfTokenFromJson(request, jsonBody);
  assertEquals(isValid, true);
});

Deno.test("validateCsrfTokenFromJson should return false for non-matching tokens", () => {
  const token1 = generateCsrfToken();
  const token2 = generateCsrfToken();
  const headers = new Headers();
  headers.set("Cookie", `${CSRF_COOKIE_NAME}=${token1}`);
  const request = new Request("https://example.com", { headers });

  const jsonBody = {
    [CSRF_FIELD_NAME]: token2,
  };

  const isValid = validateCsrfTokenFromJson(request, jsonBody);
  assertEquals(isValid, false);
});

Deno.test("validateCsrfTokenFromJson should return false when cookie missing", () => {
  const request = new Request("https://example.com");
  const jsonBody = {
    [CSRF_FIELD_NAME]: generateCsrfToken(),
  };

  const isValid = validateCsrfTokenFromJson(request, jsonBody);
  assertEquals(isValid, false);
});

Deno.test("validateCsrfTokenFromJson should return false when body token missing", () => {
  const token = generateCsrfToken();
  const headers = new Headers();
  headers.set("Cookie", `${CSRF_COOKIE_NAME}=${token}`);
  const request = new Request("https://example.com", { headers });

  const jsonBody = {};

  const isValid = validateCsrfTokenFromJson(request, jsonBody);
  assertEquals(isValid, false);
});

Deno.test("validateCsrfToken should validate token from FormData", async () => {
  const token = generateCsrfToken();
  const headers = new Headers();
  headers.set("Cookie", `${CSRF_COOKIE_NAME}=${token}`);
  const request = new Request("https://example.com", { headers });

  const formData = new FormData();
  formData.set(CSRF_FIELD_NAME, token);

  const isValid = await validateCsrfToken(request, formData);
  assertEquals(isValid, true);
});

Deno.test("validateCsrfToken should validate token from JSON body", async () => {
  const token = generateCsrfToken();
  const headers = new Headers();
  headers.set("Cookie", `${CSRF_COOKIE_NAME}=${token}`);
  const request = new Request("https://example.com", { headers });

  const jsonBody = {
    [CSRF_FIELD_NAME]: token,
  };

  const isValid = await validateCsrfToken(request, undefined, jsonBody);
  assertEquals(isValid, true);
});

Deno.test("validateCsrfToken should parse form-urlencoded content type", async () => {
  const token = generateCsrfToken();
  const headers = new Headers();
  headers.set("Cookie", `${CSRF_COOKIE_NAME}=${token}`);
  headers.set("Content-Type", "application/x-www-form-urlencoded");

  // Create URL-encoded form data
  const formBody = new URLSearchParams();
  formBody.set(CSRF_FIELD_NAME, token);
  const request = new Request("https://example.com", {
    method: "POST",
    headers,
    body: formBody.toString(),
  });

  const isValid = await validateCsrfToken(request);
  assertEquals(isValid, true);
});

Deno.test("validateCsrfToken should parse JSON content type", async () => {
  const token = generateCsrfToken();
  const headers = new Headers();
  headers.set("Cookie", `${CSRF_COOKIE_NAME}=${token}`);
  headers.set("Content-Type", "application/json");

  const jsonBody = JSON.stringify({ [CSRF_FIELD_NAME]: token });
  const request = new Request("https://example.com", {
    method: "POST",
    headers,
    body: jsonBody,
  });

  const isValid = await validateCsrfToken(request);
  assertEquals(isValid, true);
});

Deno.test("createCsrfErrorResponse should create 403 response", async () => {
  const response = createCsrfErrorResponse();

  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error, "Forbidden");
  assertEquals(body.message, "Invalid CSRF token");
});
