/**
 * Unit tests for API error response utilities
 */

import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  createBadRequestResponse,
  createErrorResponse,
  createForbiddenResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
  createTooManyRequestsResponse,
  createUnauthorizedResponse,
  createValidationErrorResponse,
} from "./errors.ts";

Deno.test("createErrorResponse should create response with correct status", async () => {
  const response = createErrorResponse(400, "Bad Request", "Invalid input");

  assertEquals(response.status, 400);
  assertEquals(response.headers.get("Content-Type"), "application/json");

  const body = await response.json();
  assertEquals(body.error, "Bad Request");
  assertEquals(body.message, "Invalid input");
});

Deno.test("createErrorResponse should include optional details", async () => {
  const details = { email: "Invalid email format" };
  const response = createErrorResponse(
    400,
    "Validation failed",
    "Invalid input",
    details,
  );

  const body = await response.json();
  assertEquals(body.details, details);
});

Deno.test("createErrorResponse should include optional code", async () => {
  const response = createErrorResponse(
    400,
    "Bad Request",
    "Invalid input",
    undefined,
    "INVALID_INPUT",
  );

  const body = await response.json();
  assertEquals(body.code, "INVALID_INPUT");
});

Deno.test("createValidationErrorResponse should create 400 response with details", async () => {
  const details = { email: "Invalid email", password: "Too short" };
  const response = createValidationErrorResponse(details);

  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error, "Validation failed");
  assertEquals(body.details, details);
});

Deno.test("createValidationErrorResponse should use custom message", async () => {
  const details = { email: "Invalid email" };
  const response = createValidationErrorResponse(
    details,
    "Custom validation message",
  );

  const body = await response.json();
  assertEquals(body.message, "Custom validation message");
});

Deno.test("createBadRequestResponse should create 400 response", async () => {
  const response = createBadRequestResponse("Invalid input");

  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error, "Bad Request");
  assertEquals(body.message, "Invalid input");
});

Deno.test("createBadRequestResponse should include field in details when provided", async () => {
  const response = createBadRequestResponse("Invalid email", "email");

  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error, "Validation failed");
  assertEquals(body.details?.email, "Invalid email");
});

Deno.test("createUnauthorizedResponse should create 401 response", async () => {
  const response = createUnauthorizedResponse();

  assertEquals(response.status, 401);
  const body = await response.json();
  assertEquals(body.error, "Unauthorized");
  assertEquals(body.message, "Unauthorized");
});

Deno.test("createUnauthorizedResponse should use custom message", async () => {
  const response = createUnauthorizedResponse("Please log in");

  const body = await response.json();
  assertEquals(body.message, "Please log in");
});

Deno.test("createNotFoundResponse should create 404 response", async () => {
  const response = createNotFoundResponse();

  assertEquals(response.status, 404);
  const body = await response.json();
  assertEquals(body.error, "Not Found");
  assertEquals(body.message, "Resource not found");
});

Deno.test("createNotFoundResponse should use custom message", async () => {
  const response = createNotFoundResponse("User not found");

  const body = await response.json();
  assertEquals(body.message, "User not found");
});

Deno.test("createInternalServerErrorResponse should create 500 response", async () => {
  const response = createInternalServerErrorResponse("Something went wrong");

  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.error, "Internal Server Error");
  assertEquals(body.message, "Something went wrong");
});

Deno.test("createInternalServerErrorResponse should support old signature", async () => {
  const error = new Error("Test error");
  const response = createInternalServerErrorResponse(
    "Something went wrong",
    error,
  );

  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.error, "Internal Server Error");
});

Deno.test("createForbiddenResponse should create 403 response", async () => {
  const response = createForbiddenResponse("Access denied");

  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error, "Forbidden");
  assertEquals(body.message, "Access denied");
});

Deno.test("createForbiddenResponse should include optional code", async () => {
  const response = createForbiddenResponse(
    "Access denied",
    "INSUFFICIENT_PERMISSIONS",
  );

  const body = await response.json();
  assertEquals(body.code, "INSUFFICIENT_PERMISSIONS");
});

Deno.test("createTooManyRequestsResponse should create 429 response", async () => {
  const response = createTooManyRequestsResponse("Rate limit exceeded", 60);

  assertEquals(response.status, 429);
  const body = await response.json();
  assertEquals(body.error, "Too Many Requests");
  assertEquals(body.message, "Rate limit exceeded");
  assertEquals(body.rateLimitExceeded, true);
  assertEquals(body.remainingSeconds, 60);
});

Deno.test("createTooManyRequestsResponse should handle null remainingSeconds", async () => {
  const response = createTooManyRequestsResponse("Rate limit exceeded", null);

  const body = await response.json();
  assertEquals(body.remainingSeconds, undefined);
});
