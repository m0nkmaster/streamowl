/**
 * HTTP caching utilities for API responses
 *
 * Provides ETag generation and conditional request handling
 * to support 304 Not Modified responses and reduce bandwidth
 */

/**
 * Generate an ETag from response data
 *
 * @param data The response data to generate an ETag for
 * @returns ETag string (e.g., "W/\"abc123\"")
 */
export async function generateETag(data: unknown): Promise<string> {
  const dataString = typeof data === "string"
    ? data
    : JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  // Use weak ETag (W/) since content may vary slightly but be semantically equivalent
  return `W/"${hashHex.substring(0, 16)}"`;
}

/**
 * Check if request has matching ETag (conditional request)
 *
 * @param request The incoming request
 * @param etag The current ETag for the resource
 * @returns true if ETags match (should return 304)
 */
export function isNotModified(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (!ifNoneMatch) {
    return false;
  }

  // Check if any of the provided ETags match
  const etags = ifNoneMatch.split(",").map((e) => e.trim());
  return etags.includes(etag) || etags.includes("*");
}

/**
 * Create a 304 Not Modified response
 *
 * @param etag The ETag for the resource
 * @param cacheControl Cache-Control header value
 * @returns 304 Response
 */
export function createNotModifiedResponse(
  etag: string,
  cacheControl?: string,
): Response {
  const headers: HeadersInit = {
    ETag: etag,
  };

  if (cacheControl) {
    headers["Cache-Control"] = cacheControl;
  }

  return new Response(null, {
    status: 304,
    headers,
  });
}

/**
 * Create a cached response with ETag support
 *
 * @param data The response data
 * @param options Response options including cache settings
 * @returns Response with appropriate caching headers
 */
export async function createCachedResponse(
  data: unknown,
  options: {
    status?: number;
    cacheControl: string;
    contentType?: string;
  },
): Promise<Response> {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  const etag = await generateETag(data);

  const headers: HeadersInit = {
    ETag: etag,
    "Cache-Control": options.cacheControl,
    "Content-Type": options.contentType || "application/json",
  };

  return new Response(body, {
    status: options.status || 200,
    headers,
  });
}

/**
 * Handle conditional request and return cached response if not modified
 *
 * @param request The incoming request
 * @param data The response data
 * @param cacheControl Cache-Control header value
 * @returns Either 304 Not Modified or full response
 */
export async function handleConditionalRequest(
  request: Request,
  data: unknown,
  cacheControl: string,
): Promise<Response> {
  const etag = await generateETag(data);

  if (isNotModified(request, etag)) {
    return createNotModifiedResponse(etag, cacheControl);
  }

  return createCachedResponse(data, {
    cacheControl,
    contentType: "application/json",
  });
}

/**
 * Cache control presets for common scenarios
 */
export const CachePresets = {
  /** Public cacheable for 1 hour (e.g., trending, search results) */
  PUBLIC_1H: "public, max-age=3600",
  /** Public cacheable for 2 hours (e.g., new releases) */
  PUBLIC_2H: "public, max-age=7200",
  /** Private cacheable for 1 hour (e.g., user-specific data) */
  PRIVATE_1H: "private, max-age=3600",
  /** Private cacheable for 5 minutes (e.g., user status) */
  PRIVATE_5M: "private, max-age=300",
  /** No cache (e.g., mutations, sensitive data) */
  NO_CACHE: "no-cache, no-store, must-revalidate",
} as const;
