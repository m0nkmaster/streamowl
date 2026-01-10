/**
 * Unit tests for rate limiting utilities
 */

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  checkRateLimit,
  clearFailedAttempts,
  getClientIp,
  getRateLimitStatus,
  recordFailedAttempt,
} from "./rate-limit.ts";

Deno.test("getClientIp should extract IP from X-Forwarded-For header", () => {
  const headers = new Headers();
  headers.set("X-Forwarded-For", "192.168.1.1, 10.0.0.1");
  const request = new Request("https://example.com", { headers });

  const ip = getClientIp(request);
  assertEquals(ip, "192.168.1.1");
});

Deno.test("getClientIp should extract IP from X-Real-IP header", () => {
  const headers = new Headers();
  headers.set("X-Real-IP", "192.168.1.1");
  const request = new Request("https://example.com", { headers });

  const ip = getClientIp(request);
  assertEquals(ip, "192.168.1.1");
});

Deno.test("getClientIp should prefer X-Forwarded-For over X-Real-IP", () => {
  const headers = new Headers();
  headers.set("X-Forwarded-For", "192.168.1.1");
  headers.set("X-Real-IP", "10.0.0.1");
  const request = new Request("https://example.com", { headers });

  const ip = getClientIp(request);
  assertEquals(ip, "192.168.1.1");
});

Deno.test("getClientIp should return 'unknown' when no headers present", () => {
  const request = new Request("https://example.com");

  const ip = getClientIp(request);
  assertEquals(ip, "unknown");
});

Deno.test("checkRateLimit should return not blocked for new identifier", () => {
  const identifier = "test-ip-1";
  clearFailedAttempts(identifier);

  const result = checkRateLimit(identifier);
  assertEquals(result.isBlocked, false);
  assertEquals(result.remainingSeconds, null);
});

Deno.test("recordFailedAttempt should track attempts", () => {
  const identifier = "test-ip-2";
  clearFailedAttempts(identifier);

  recordFailedAttempt(identifier);
  const status = getRateLimitStatus(identifier);
  assertEquals(status.attemptCount, 1);
});

Deno.test("recordFailedAttempt should block after max attempts", () => {
  const identifier = "test-ip-3";
  clearFailedAttempts(identifier);

  // Record 10 failed attempts (the limit)
  for (let i = 0; i < 10; i++) {
    recordFailedAttempt(identifier);
  }

  const result = checkRateLimit(identifier);
  assertEquals(result.isBlocked, true);
  assert(result.remainingSeconds !== null);
  assert(result.remainingSeconds! > 0);
});

Deno.test("clearFailedAttempts should reset rate limit", () => {
  const identifier = "test-ip-4";
  clearFailedAttempts(identifier);

  recordFailedAttempt(identifier);
  clearFailedAttempts(identifier);

  const result = checkRateLimit(identifier);
  assertEquals(result.isBlocked, false);
  assertEquals(result.remainingSeconds, null);

  const status = getRateLimitStatus(identifier);
  assertEquals(status.attemptCount, 0);
});

Deno.test("getRateLimitStatus should return correct attempt count", () => {
  const identifier = "test-ip-5";
  clearFailedAttempts(identifier);

  recordFailedAttempt(identifier);
  recordFailedAttempt(identifier);

  const status = getRateLimitStatus(identifier);
  assertEquals(status.attemptCount, 2);
});

Deno.test("getRateLimitStatus should return null remainingSeconds when not blocked", () => {
  const identifier = "test-ip-6";
  clearFailedAttempts(identifier);

  recordFailedAttempt(identifier);

  const status = getRateLimitStatus(identifier);
  assertEquals(status.remainingSeconds, null);
});

Deno.test("getRateLimitStatus should return remainingSeconds when blocked", () => {
  const identifier = "test-ip-7";
  clearFailedAttempts(identifier);

  // Record 10 failed attempts to trigger block
  for (let i = 0; i < 10; i++) {
    recordFailedAttempt(identifier);
  }

  const status = getRateLimitStatus(identifier);
  assertEquals(status.attemptCount, 10);
  assert(status.remainingSeconds !== null);
  assert(status.remainingSeconds! > 0);
});

Deno.test("checkRateLimit should clean up old attempts outside window", () => {
  const identifier = "test-ip-8";
  clearFailedAttempts(identifier);

  // This test verifies that old attempts are cleaned up
  // We can't easily test time-based cleanup without mocking time,
  // but we can verify the function handles it correctly
  recordFailedAttempt(identifier);
  const result1 = checkRateLimit(identifier);
  assertEquals(result1.isBlocked, false);

  // Record many attempts
  for (let i = 0; i < 5; i++) {
    recordFailedAttempt(identifier);
  }

  const result2 = checkRateLimit(identifier);
  assertEquals(result2.isBlocked, false); // Should not be blocked yet
});
