/**
 * Unit tests for XSS prevention utilities
 */

import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { escapeHtml, escapeHtmlAttribute, escapeJsString } from "./xss.ts";

Deno.test("escapeHtml should escape HTML special characters", () => {
  assertEquals(
    escapeHtml("<script>alert('XSS')</script>"),
    "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;",
  );
  assertEquals(escapeHtml("Hello & World"), "Hello &amp; World");
  assertEquals(escapeHtml('Quote "test"'), "Quote &quot;test&quot;");
  assertEquals(escapeHtml("Tag <div>"), "Tag &lt;div&gt;");
});

Deno.test("escapeHtml should handle null and undefined", () => {
  assertEquals(escapeHtml(null), "");
  assertEquals(escapeHtml(undefined), "");
});

Deno.test("escapeHtml should handle empty string", () => {
  assertEquals(escapeHtml(""), "");
});

Deno.test("escapeHtml should handle strings without special characters", () => {
  assertEquals(escapeHtml("Hello World"), "Hello World");
  assertEquals(escapeHtml("123"), "123");
});

Deno.test("escapeHtml should escape all HTML special characters", () => {
  const input = "&<>\"'";
  const output = escapeHtml(input);
  assertEquals(output, "&amp;&lt;&gt;&quot;&#x27;");
});

Deno.test("escapeHtmlAttribute should work like escapeHtml", () => {
  assertEquals(escapeHtmlAttribute("<script>"), "&lt;script&gt;");
  assertEquals(
    escapeHtmlAttribute('Title with "quotes"'),
    "Title with &quot;quotes&quot;",
  );
  assertEquals(escapeHtmlAttribute(null), "");
});

Deno.test("escapeJsString should escape JavaScript special characters", () => {
  assertEquals(escapeJsString('Hello "world"'), 'Hello \\"world\\"');
  assertEquals(escapeJsString("Hello 'world'"), "Hello \\'world\\'");
  assertEquals(escapeJsString("Line 1\nLine 2"), "Line 1\\nLine 2");
  assertEquals(escapeJsString("Tab\there"), "Tab\\there");
  assertEquals(escapeJsString("Backslash\\here"), "Backslash\\\\here");
});

Deno.test("escapeJsString should handle null and undefined", () => {
  assertEquals(escapeJsString(null), "");
  assertEquals(escapeJsString(undefined), "");
});

Deno.test("escapeJsString should handle empty string", () => {
  assertEquals(escapeJsString(""), "");
});

Deno.test("escapeJsString should escape carriage return", () => {
  assertEquals(escapeJsString("Line 1\rLine 2"), "Line 1\\rLine 2");
});

Deno.test("escapeJsString should handle complex XSS payload", () => {
  const payload = '"; alert("XSS"); //';
  const escaped = escapeJsString(payload);
  assertEquals(escaped, '\\"; alert(\\"XSS\\"); //');
});
