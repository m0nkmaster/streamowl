import { type Handlers } from "$fresh/server.ts";
import { clearSessionCookie } from "../../lib/auth/cookies.ts";
import {
  validateCsrfToken,
  createCsrfErrorResponse,
} from "../../lib/security/csrf.ts";

/**
 * API handler for user logout
 * Clears the session cookie and redirects to homepage
 */
export const handler: Handlers = {
  async POST(req) {
    // Validate CSRF token for POST requests
    const formData = await req.formData();
    const isValidCsrf = await validateCsrfToken(req, formData);
    if (!isValidCsrf) {
      return createCsrfErrorResponse();
    }

    const headers = new Headers();
    clearSessionCookie(headers);

    // Redirect to homepage
    headers.set("Location", "/");
    return new Response(null, {
      status: 302,
      headers,
    });
  },
  GET(_req) {
    // Support GET requests for logout (e.g., from links)
    // GET requests don't need CSRF protection as they're idempotent
    const headers = new Headers();
    clearSessionCookie(headers);

    // Redirect to homepage
    headers.set("Location", "/");
    return new Response(null, {
      status: 302,
      headers,
    });
  },
};
