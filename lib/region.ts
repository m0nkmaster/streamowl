/**
 * Region detection and management utilities
 *
 * Provides functions to detect user region from request headers
 * and manage region preferences.
 */

import { SUPPORTED_REGIONS } from "./tmdb/client.ts";
import type { SupportedRegion } from "./tmdb/client.ts";

/**
 * Map language codes to supported regions
 * Based on Accept-Language header parsing
 */
const LANGUAGE_TO_REGION: Record<string, SupportedRegion> = {
  "en-GB": "GB", // United Kingdom
  "en-US": "US", // United States
  "en-CA": "CA", // Canada
  "en-AU": "AU", // Australia
  "de": "DE", // Germany
  "de-DE": "DE",
  "fr": "FR", // France
  "fr-FR": "FR",
};

/**
 * Default region if detection fails
 */
const DEFAULT_REGION: SupportedRegion = "US";

/**
 * Detect user region from Accept-Language header
 *
 * Parses the Accept-Language header and maps language codes to supported regions.
 * Falls back to default region if no match is found.
 *
 * @param acceptLanguage Accept-Language header value (e.g., "en-GB,en-US;q=0.9")
 * @returns Detected region code
 */
export function detectRegionFromAcceptLanguage(
  acceptLanguage: string | null,
): SupportedRegion {
  if (!acceptLanguage) {
    return DEFAULT_REGION;
  }

  // Parse Accept-Language header
  // Format: "en-GB,en-US;q=0.9,en;q=0.8"
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      // Extract language code (before semicolon if present)
      const parts = lang.trim().split(";");
      return parts[0].trim().toLowerCase();
    });

  // Try to find a match in order of preference
  for (const lang of languages) {
    // Try exact match first (e.g., "en-GB")
    if (lang in LANGUAGE_TO_REGION) {
      return LANGUAGE_TO_REGION[lang];
    }

    // Try language code only (e.g., "en" -> check for "en-GB", "en-US", etc.)
    const langCode = lang.split("-")[0];
    if (langCode in LANGUAGE_TO_REGION) {
      return LANGUAGE_TO_REGION[langCode];
    }
  }

  // No match found, return default
  return DEFAULT_REGION;
}

/**
 * Detect user region from request headers
 *
 * Attempts to detect region from Accept-Language header.
 * Can be extended in the future to use IP geolocation or user preferences.
 *
 * @param request Request object
 * @returns Detected region code
 */
export function detectRegionFromRequest(request: Request): SupportedRegion {
  const acceptLanguage = request.headers.get("Accept-Language");
  return detectRegionFromAcceptLanguage(acceptLanguage);
}

/**
 * Get region name for display
 *
 * @param region Region code
 * @returns Human-readable region name
 */
export function getRegionName(region: SupportedRegion): string {
  const regionNames: Record<SupportedRegion, string> = {
    US: "United States",
    GB: "United Kingdom",
    CA: "Canada",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
  };
  return regionNames[region] || region;
}

/**
 * Validate if a region code is supported
 *
 * @param region Region code to validate
 * @returns True if region is supported
 */
export function isSupportedRegion(
  region: string,
): region is SupportedRegion {
  return (SUPPORTED_REGIONS as readonly string[]).includes(region);
}
