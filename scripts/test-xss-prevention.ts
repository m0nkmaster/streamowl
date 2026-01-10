#!/usr/bin/env -S deno run -A

/**
 * Test script for XSS prevention
 *
 * Tests:
 * 1. Verify HTML escaping prevents script tag execution
 * 2. Verify HTML is escaped in output
 * 3. Verify various XSS attack vectors are neutralised
 * 4. Test edge cases (null, undefined, empty strings)
 */

import {
  escapeHtml,
  escapeHtmlAttribute,
  escapeJsString,
} from "../lib/security/xss.ts";

console.log("Testing XSS Prevention\n");
console.log("=".repeat(50));

// Test 1: Script tag injection
console.log("\n1. Testing script tag injection prevention...");
const scriptTag = "<script>alert('XSS')</script>";
const escapedScript = escapeHtml(scriptTag);
console.log(`   Input:    ${scriptTag}`);
console.log(`   Escaped:  ${escapedScript}`);
console.log(`   Expected: &lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;`);

if (escapedScript.includes("<script>") || escapedScript.includes("</script>")) {
  console.error("   ✗ FAILED: Script tags not escaped!");
  Deno.exit(1);
}
if (!escapedScript.includes("&lt;") || !escapedScript.includes("&gt;")) {
  console.error("   ✗ FAILED: HTML entities not created!");
  Deno.exit(1);
}
console.log("   ✓ PASSED: Script tags properly escaped");

// Test 2: Event handler injection
console.log("\n2. Testing event handler injection prevention...");
const eventHandler = '<img src="x" onerror="alert(\'XSS\')">';
const escapedEvent = escapeHtml(eventHandler);
console.log(`   Input:    ${eventHandler}`);
console.log(`   Escaped:  ${escapedEvent}`);

// The key is that quotes and angle brackets are escaped, making it safe
// The word "onerror" will still appear but won't execute because quotes are escaped
if (!escapedEvent.includes("&quot;")) {
  console.error("   ✗ FAILED: Quotes not escaped!");
  Deno.exit(1);
}
if (!escapedEvent.includes("&lt;") || !escapedEvent.includes("&gt;")) {
  console.error("   ✗ FAILED: Angle brackets not escaped!");
  Deno.exit(1);
}
// Verify that when rendered, it won't execute (quotes are escaped)
if (escapedEvent.match(/onerror\s*=\s*["']/)) {
  console.error("   ✗ FAILED: Event handler quotes not escaped!");
  Deno.exit(1);
}
console.log("   ✓ PASSED: Event handlers properly escaped");

// Test 3: JavaScript protocol injection
console.log("\n3. Testing JavaScript protocol injection prevention...");
const jsProtocol = "<a href=\"javascript:alert('XSS')\">Click</a>";
const escapedJs = escapeHtml(jsProtocol);
console.log(`   Input:    ${jsProtocol}`);
console.log(`   Escaped:  ${escapedJs}`);

// The key is that quotes and angle brackets are escaped
// The word "javascript:" will still appear but won't execute because quotes are escaped
if (!escapedJs.includes("&quot;")) {
  console.error("   ✗ FAILED: Quotes not escaped!");
  Deno.exit(1);
}
if (!escapedJs.includes("&lt;") || !escapedJs.includes("&gt;")) {
  console.error("   ✗ FAILED: Angle brackets not escaped!");
  Deno.exit(1);
}
// Verify that when rendered, it won't execute (quotes are escaped, breaking the href attribute)
if (escapedJs.match(/href\s*=\s*["']javascript:/)) {
  console.error("   ✗ FAILED: JavaScript protocol quotes not escaped!");
  Deno.exit(1);
}
console.log("   ✓ PASSED: JavaScript protocol properly escaped");

// Test 4: HTML attribute escaping
console.log("\n4. Testing HTML attribute escaping...");
const attributeValue = "Title with \"quotes\" and 'apostrophes'";
const escapedAttr = escapeHtmlAttribute(attributeValue);
console.log(`   Input:    ${attributeValue}`);
console.log(`   Escaped:  ${escapedAttr}`);

if (escapedAttr.includes('"') && !escapedAttr.includes("&quot;")) {
  console.error("   ✗ FAILED: Quotes in attributes not escaped!");
  Deno.exit(1);
}
console.log("   ✓ PASSED: HTML attributes properly escaped");

// Test 5: JavaScript string escaping
console.log("\n5. Testing JavaScript string escaping...");
const jsString = 'Hello "world" with\nnewlines';
const escapedJsStr = escapeJsString(jsString);
console.log(`   Input:    ${jsString}`);
console.log(`   Escaped:  ${escapedJsStr}`);

if (!escapedJsStr.includes('\\"')) {
  console.error("   ✗ FAILED: Quotes in JS strings not escaped!");
  Deno.exit(1);
}
if (!escapedJsStr.includes("\\n")) {
  console.error("   ✗ FAILED: Newlines in JS strings not escaped!");
  Deno.exit(1);
}
console.log("   ✓ PASSED: JavaScript strings properly escaped");

// Test 6: Edge cases
console.log("\n6. Testing edge cases...");

const nullResult = escapeHtml(null);
if (nullResult !== "") {
  console.error(
    `   ✗ FAILED: null should return empty string, got: ${nullResult}`,
  );
  Deno.exit(1);
}

const undefinedResult = escapeHtml(undefined);
if (undefinedResult !== "") {
  console.error(
    `   ✗ FAILED: undefined should return empty string, got: ${undefinedResult}`,
  );
  Deno.exit(1);
}

const emptyResult = escapeHtml("");
if (emptyResult !== "") {
  console.error(
    `   ✗ FAILED: empty string should return empty string, got: ${emptyResult}`,
  );
  Deno.exit(1);
}

console.log("   ✓ PASSED: Edge cases handled correctly");

// Test 7: Real-world XSS payloads
console.log("\n7. Testing real-world XSS payloads...");

const xssPayloads = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "<svg onload=alert('XSS')>",
  "javascript:alert('XSS')",
  "<iframe src=javascript:alert('XSS')>",
  "<body onload=alert('XSS')>",
  "<input onfocus=alert('XSS') autofocus>",
  "<select onfocus=alert('XSS') autofocus>",
  "<textarea onfocus=alert('XSS') autofocus>",
  "<keygen onfocus=alert('XSS') autofocus>",
  "<video><source onerror=alert('XSS')>",
  "<audio src=x onerror=alert('XSS')>",
];

let allPassed = true;
for (const payload of xssPayloads) {
  const escaped = escapeHtml(payload);
  // Check that dangerous patterns are escaped (angle brackets and quotes)
  // The key is that < > " ' are escaped, not that keywords disappear
  // Verify that angle brackets are escaped (they should be &lt; and &gt;)
  if (escaped.includes("<") || escaped.includes(">")) {
    console.error(`   ✗ FAILED: Angle brackets not escaped in: ${payload}`);
    console.error(`   Escaped: ${escaped}`);
    allPassed = false;
    continue;
  }
  // Verify that quotes are escaped in attribute contexts
  // Event handlers and javascript: protocols won't execute if quotes are escaped
  if (
    escaped.match(/on\w+\s*=\s*["']/) ||
    escaped.match(/href\s*=\s*["']javascript:/)
  ) {
    console.error(
      `   ✗ FAILED: Quotes not escaped in dangerous context: ${payload}`,
    );
    console.error(`   Escaped: ${escaped}`);
    allPassed = false;
  }
}

if (!allPassed) {
  Deno.exit(1);
}
console.log(`   ✓ PASSED: All ${xssPayloads.length} XSS payloads neutralised`);

// Test 8: Verify escaped content doesn't execute when rendered
console.log("\n8. Testing that escaped content is safe for HTML output...");

const maliciousInput = "<script>document.cookie='stolen'</script>";
const safeOutput = escapeHtml(maliciousInput);

// Simulate rendering in HTML
const htmlOutput = `<div>${safeOutput}</div>`;

// Verify the script tag is escaped and won't execute
if (htmlOutput.includes("<script>")) {
  console.error("   ✗ FAILED: Script tag still present in HTML output!");
  Deno.exit(1);
}

if (!htmlOutput.includes("&lt;script&gt;")) {
  console.error("   ✗ FAILED: Script tag not properly escaped!");
  Deno.exit(1);
}

console.log("   ✓ PASSED: Escaped content is safe for HTML output");

console.log("\n" + "=".repeat(50));
console.log("\n✓ All XSS prevention tests passed!");
console.log("\nNote: Preact/React automatically escapes JSX content, but");
console.log(
  "these utilities should be used when working with raw HTML strings",
);
console.log("or when setting HTML attributes from user input.");
