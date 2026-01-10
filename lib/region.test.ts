/**
 * Unit tests for region detection utilities
 */

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  detectRegionFromAcceptLanguage,
  detectRegionFromRequest,
  getRegionName,
  isSupportedRegion,
} from "./region.ts";

Deno.test("detectRegionFromAcceptLanguage should detect GB from en-GB", () => {
  const region = detectRegionFromAcceptLanguage("en-GB,en-US;q=0.9");

  assertEquals(region, "GB");
});

Deno.test("detectRegionFromAcceptLanguage should detect US from en-US", () => {
  const region = detectRegionFromAcceptLanguage("en-US,en;q=0.9");

  assertEquals(region, "US");
});

Deno.test("detectRegionFromAcceptLanguage should detect CA from en-CA", () => {
  const region = detectRegionFromAcceptLanguage("en-CA");

  assertEquals(region, "CA");
});

Deno.test("detectRegionFromAcceptLanguage should detect AU from en-AU", () => {
  const region = detectRegionFromAcceptLanguage("en-AU");

  assertEquals(region, "AU");
});

Deno.test("detectRegionFromAcceptLanguage should detect DE from de", () => {
  const region = detectRegionFromAcceptLanguage("de-DE,de;q=0.9");

  assertEquals(region, "DE");
});

Deno.test("detectRegionFromAcceptLanguage should detect FR from fr", () => {
  const region = detectRegionFromAcceptLanguage("fr-FR,fr;q=0.9");

  assertEquals(region, "FR");
});

Deno.test("detectRegionFromAcceptLanguage should return default for null", () => {
  const region = detectRegionFromAcceptLanguage(null);

  assertEquals(region, "US");
});

Deno.test("detectRegionFromAcceptLanguage should return default for unsupported language", () => {
  const region = detectRegionFromAcceptLanguage("es-ES,es;q=0.9");

  assertEquals(region, "US");
});

Deno.test("detectRegionFromAcceptLanguage should handle language code only", () => {
  const region = detectRegionFromAcceptLanguage("en");

  assertEquals(region, "US"); // Should match first en-* variant
});

Deno.test("detectRegionFromRequest should extract Accept-Language header", () => {
  const headers = new Headers();
  headers.set("Accept-Language", "en-GB");
  const request = new Request("https://example.com", { headers });

  const region = detectRegionFromRequest(request);
  assertEquals(region, "GB");
});

Deno.test("detectRegionFromRequest should return default when header missing", () => {
  const request = new Request("https://example.com");

  const region = detectRegionFromRequest(request);
  assertEquals(region, "US");
});

Deno.test("getRegionName should return correct region names", () => {
  assertEquals(getRegionName("US"), "United States");
  assertEquals(getRegionName("GB"), "United Kingdom");
  assertEquals(getRegionName("CA"), "Canada");
  assertEquals(getRegionName("AU"), "Australia");
  assertEquals(getRegionName("DE"), "Germany");
  assertEquals(getRegionName("FR"), "France");
});

Deno.test("isSupportedRegion should return true for supported regions", () => {
  assertEquals(isSupportedRegion("US"), true);
  assertEquals(isSupportedRegion("GB"), true);
  assertEquals(isSupportedRegion("CA"), true);
  assertEquals(isSupportedRegion("AU"), true);
  assertEquals(isSupportedRegion("DE"), true);
  assertEquals(isSupportedRegion("FR"), true);
});

Deno.test("isSupportedRegion should return false for unsupported regions", () => {
  assertEquals(isSupportedRegion("ES"), false);
  assertEquals(isSupportedRegion("IT"), false);
  assertEquals(isSupportedRegion("XX"), false);
  assertEquals(isSupportedRegion(""), false);
});

Deno.test("getRegionName should return proper names for all supported regions", () => {
  // Verify all supported regions return proper names
  const regions: Array<"US" | "GB" | "CA" | "AU" | "DE" | "FR"> = [
    "US",
    "GB",
    "CA",
    "AU",
    "DE",
    "FR",
  ];
  const expectedNames = {
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
  };

  for (const region of regions) {
    const name = getRegionName(region);
    assertEquals(name, expectedNames[region]);
  }
});

Deno.test("detectRegionFromAcceptLanguage should handle multiple languages with quality values", () => {
  const region = detectRegionFromAcceptLanguage(
    "fr-FR,en-GB;q=0.8,en-US;q=0.6",
  );

  // Should prefer fr-FR over en-GB
  assertEquals(region, "FR");
});

Deno.test("detectRegionFromAcceptLanguage should handle language code fallback", () => {
  // When only language code is provided (e.g., "en"), it should match first en-* variant
  // But since "en" is not in the map, it should fall back to default
  const region = detectRegionFromAcceptLanguage("en");

  // Should return default since "en" alone doesn't match any specific region
  assertEquals(region, "US");
});
