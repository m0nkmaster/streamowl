#!/usr/bin/env -S deno run -A

/**
 * Test script for structured logging
 *
 * Verifies that:
 * 1. Errors are logged with stack traces
 * 2. Logs include request context
 * 3. Logs are JSON formatted
 */

import {
  extractRequestContext,
  logError,
  logInfo,
  logWarn,
} from "../lib/logging/logger.ts";

// Capture console output
const logs: string[] = [];
const originalError = console.error;
const originalInfo = console.info;
const originalWarn = console.warn;

console.error = (...args: unknown[]) => {
  logs.push(`ERROR: ${args.join(" ")}`);
  originalError(...args);
};

console.info = (...args: unknown[]) => {
  logs.push(`INFO: ${args.join(" ")}`);
  originalInfo(...args);
};

console.warn = (...args: unknown[]) => {
  logs.push(`WARN: ${args.join(" ")}`);
  originalWarn(...args);
};

async function testLogging() {
  console.log("Testing structured logging...\n");

  // Test 1: Log error with stack trace
  console.log("Test 1: Logging error with stack trace");
  const testError = new Error("Test error message");
  testError.stack =
    "Error: Test error message\n    at testLogging (test-logging.ts:50)";

  await logError("Test error occurred", undefined, testError);

  const errorLog = logs.find((log) => log.includes("ERROR:"));
  if (!errorLog) {
    console.error("❌ FAIL: Error log not found");
    return false;
  }

  try {
    const logEntry = JSON.parse(errorLog.replace("ERROR: ", ""));
    if (!logEntry.error || !logEntry.error.stack) {
      console.error("❌ FAIL: Error log missing stack trace");
      console.error("Log entry:", JSON.stringify(logEntry, null, 2));
      return false;
    }
    console.log("✅ PASS: Error logged with stack trace");
  } catch {
    console.error("❌ FAIL: Error log is not valid JSON");
    console.error("Log:", errorLog);
    return false;
  }

  // Test 2: Log with request context
  console.log("\nTest 2: Logging with request context");
  const testRequest = new Request("https://example.com/api/test", {
    method: "POST",
    headers: {
      "user-agent": "Test-Agent/1.0",
      "x-forwarded-for": "192.168.1.1",
    },
  });

  await logInfo("Test info message", testRequest);

  const infoLog = logs.find((log) => log.includes("INFO:"));
  if (!infoLog) {
    console.error("❌ FAIL: Info log not found");
    return false;
  }

  try {
    const logEntry = JSON.parse(infoLog.replace("INFO: ", ""));
    if (
      !logEntry.context || !logEntry.context.method || !logEntry.context.url
    ) {
      console.error("❌ FAIL: Log missing request context");
      console.error("Log entry:", JSON.stringify(logEntry, null, 2));
      return false;
    }
    if (logEntry.context.method !== "POST") {
      console.error("❌ FAIL: Request method not captured correctly");
      return false;
    }
    if (logEntry.context.ip !== "192.168.1.1") {
      console.error("❌ FAIL: IP address not captured correctly");
      return false;
    }
    console.log("✅ PASS: Request context captured correctly");
  } catch {
    console.error("❌ FAIL: Info log is not valid JSON");
    console.error("Log:", infoLog);
    return false;
  }

  // Test 3: Verify JSON format
  console.log("\nTest 3: Verifying JSON format");
  await logWarn("Test warning", undefined, new Error("Warning error"));

  const warnLog = logs.find((log) => log.includes("WARN:"));
  if (!warnLog) {
    console.error("❌ FAIL: Warn log not found");
    return false;
  }

  try {
    const logEntry = JSON.parse(warnLog.replace("WARN: ", ""));
    if (!logEntry.timestamp || !logEntry.level || !logEntry.message) {
      console.error("❌ FAIL: Log missing required fields");
      console.error("Log entry:", JSON.stringify(logEntry, null, 2));
      return false;
    }
    if (logEntry.level !== "warn") {
      console.error("❌ FAIL: Log level incorrect");
      return false;
    }
    console.log("✅ PASS: Log is valid JSON with required fields");
  } catch (e) {
    console.error("❌ FAIL: Warn log is not valid JSON");
    console.error("Error:", e);
    console.error("Log:", warnLog);
    return false;
  }

  // Test 4: Extract request context
  console.log("\nTest 4: Testing request context extraction");
  const context = await extractRequestContext(testRequest);
  if (!context.method || !context.url || !context.ip) {
    console.error("❌ FAIL: Request context extraction incomplete");
    console.error("Context:", context);
    return false;
  }
  console.log("✅ PASS: Request context extraction works");
  console.log("   Context:", JSON.stringify(context, null, 2));

  console.log("\n✅ All tests passed!");
  return true;
}

// Run tests
testLogging()
  .then((success) => {
    // Restore console methods
    console.error = originalError;
    console.info = originalInfo;
    console.warn = originalWarn;

    Deno.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed with error:", error);
    Deno.exit(1);
  });
