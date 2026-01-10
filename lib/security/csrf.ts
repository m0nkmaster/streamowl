/**
 * CSRF token generation and validation utilities
 *
 * Implements double-submit cookie pattern for CSRF protection:
 * - Token stored in HttpOnly cookie (server-side only)
 * - Same token included in forms as hidden field
 * - On submission, verify form token matches cookie token
 */

/**
 * Cookie name for CSRF token
 */
export const CSRF_COOKIE_NAME = "csrf_token";

/**
 * Form field name for CSRF token
 */
export const CSRF_FIELD_NAME = "csrf_token";

/**
 * CSRF token expiration time (1 hour)
 */
const CSRF_TOKEN_EXPIRY_SECONDS = 60 * 60;

/**
 * Generate a cryptographically secure random token
 *
 * @returns Random token string (32 bytes, base64 encoded = 44 characters)
 */
export function generateCsrfToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Set CSRF token cookie in response headers
 *
 * @param headers Response headers object
 * @param token CSRF token string
 */
export function setCsrfCookie(headers: Headers, token: string): void {
  const isProduction = Deno.env.get("DENO_ENV") === "production";
  const cookieValue =
    `${CSRF_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CSRF_TOKEN_EXPIRY_SECONDS}`;

  if (isProduction) {
    headers.set("Set-Cookie", `${cookieValue}; Secure`);
  } else {
    headers.set("Set-Cookie", cookieValue);
  }
}

/**
 * Extract CSRF token from request cookies
 *
 * @param request Request object
 * @returns CSRF token if present, undefined otherwise
 */
export function getCsrfTokenFromCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const csrfCookie = cookies.find((c) =>
    c.startsWith(`${CSRF_COOKIE_NAME}=`)
  );

  if (!csrfCookie) {
    return undefined;
  }

  return csrfCookie.substring(CSRF_COOKIE_NAME.length + 1);
}

/**
 * Extract CSRF token from form data
 *
 * @param formData FormData object
 * @returns CSRF token if present, undefined otherwise
 */
export function getCsrfTokenFromForm(formData: FormData): string | undefined {
  const token = formData.get(CSRF_FIELD_NAME)?.toString();
  return token || undefined;
}

/**
 * Extract CSRF token from JSON body
 *
 * @param body JSON body object
 * @returns CSRF token if present, undefined otherwise
 */
export function getCsrfTokenFromJson(body: Record<string, unknown>): string | undefined {
  const token = body[CSRF_FIELD_NAME];
  return typeof token === "string" ? token : undefined;
}

/**
 * Validate CSRF token from request
 *
 * Compares token from form/JSON body with token from cookie.
 * Both must be present and match for validation to succeed.
 *
 * @param request Request object
 * @param formData Optional FormData (for form submissions)
 * @param jsonBody Optional JSON body (for JSON API requests)
 * @returns true if token is valid, false otherwise
 */
export async function validateCsrfToken(
  request: Request,
  formData?: FormData,
  jsonBody?: Record<string, unknown>,
): Promise<boolean> {
  // Get token from cookie
  const cookieToken = getCsrfTokenFromCookie(request);
  if (!cookieToken) {
    return false;
  }

  // Get token from form or JSON body
  let bodyToken: string | undefined;
  if (formData) {
    bodyToken = getCsrfTokenFromForm(formData);
  } else if (jsonBody) {
    bodyToken = getCsrfTokenFromJson(jsonBody);
  } else {
    // Try to parse as form data if content type is form-urlencoded
    const contentType = request.headers.get("Content-Type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      bodyToken = getCsrfTokenFromForm(fd);
    } else if (contentType.includes("application/json")) {
      const body = await request.json() as Record<string, unknown>;
      bodyToken = getCsrfTokenFromJson(body);
    }
  }

  if (!bodyToken) {
    return false;
  }

  // Compare tokens using constant-time comparison to prevent timing attacks
  return constantTimeEquals(cookieToken, bodyToken);
}

/**
 * Validate CSRF token from parsed JSON body
 *
 * Helper function for JSON API endpoints that have already parsed the request body.
 * Extracts CSRF token from parsed JSON and compares with cookie token.
 *
 * @param request Request object
 * @param jsonBody Parsed JSON body object
 * @returns true if token is valid, false otherwise
 */
export function validateCsrfTokenFromJson(
  request: Request,
  jsonBody: Record<string, unknown>,
): boolean {
  // Get token from cookie
  const cookieToken = getCsrfTokenFromCookie(request);
  if (!cookieToken) {
    return false;
  }

  // Get token from JSON body
  const bodyToken = getCsrfTokenFromJson(jsonBody);
  if (!bodyToken) {
    return false;
  }

  // Compare tokens using constant-time comparison to prevent timing attacks
  return constantTimeEquals(cookieToken, bodyToken);
}

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * @param a First string
 * @param b Second string
 * @returns true if strings are equal, false otherwise
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Create CSRF error response
 *
 * @returns Response with 403 Forbidden status and error message
 */
export function createCsrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Invalid CSRF token" }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    },
  );
}
