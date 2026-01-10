import { type Handlers } from "$fresh/server.ts";
import { clearSessionCookie } from "../../lib/auth/cookies.ts";

/**
 * API handler for user logout
 * Clears the session cookie and redirects to homepage
 */
export const handler: Handlers = {
  POST(_req) {
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
