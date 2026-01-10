/**
 * Secure HTTP-only cookie utilities for session management
 *
 * Provides functions for setting and reading secure session cookies.
 * Cookies are HTTP-only, secure (HTTPS only), and SameSite=Lax for CSRF protection.
 */

/**
 * Cookie name for session token
 */
export const SESSION_COOKIE_NAME = "session";

/**
 * Cookie options for secure session storage
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: Deno.env.get("DENO_ENV") === "production", // HTTPS only in production
  sameSite: "Lax" as const, // CSRF protection
  path: "/", // Available site-wide
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

/**
 * Set session cookie in response headers
 *
 * @param headers Response headers object
 * @param token JWT token string
 */
export function setSessionCookie(headers: Headers, token: string): void {
  const cookieValue =
    `${SESSION_COOKIE_NAME}=${token}; Path=${SESSION_COOKIE_OPTIONS.path}; HttpOnly; SameSite=${SESSION_COOKIE_OPTIONS.sameSite}; Max-Age=${SESSION_COOKIE_OPTIONS.maxAge}`;

  if (SESSION_COOKIE_OPTIONS.secure) {
    headers.set("Set-Cookie", `${cookieValue}; Secure`);
  } else {
    headers.set("Set-Cookie", cookieValue);
  }
}

/**
 * Clear session cookie (for logout)
 *
 * @param headers Response headers object
 */
export function clearSessionCookie(headers: Headers): void {
  const cookieValue =
    `${SESSION_COOKIE_NAME}=; Path=${SESSION_COOKIE_OPTIONS.path}; HttpOnly; SameSite=${SESSION_COOKIE_OPTIONS.sameSite}; Max-Age=0`;

  if (SESSION_COOKIE_OPTIONS.secure) {
    headers.set("Set-Cookie", `${cookieValue}; Secure`);
  } else {
    headers.set("Set-Cookie", cookieValue);
  }
}

/**
 * Extract session token from request cookies
 *
 * @param request Request object
 * @returns Session token if present, undefined otherwise
 */
export function getSessionToken(request: Request): string | undefined {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) =>
    c.startsWith(`${SESSION_COOKIE_NAME}=`)
  );

  if (!sessionCookie) {
    return undefined;
  }

  return sessionCookie.substring(SESSION_COOKIE_NAME.length + 1);
}
