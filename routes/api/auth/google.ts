import { type Handlers } from "$fresh/server.ts";
import { getGoogleAuthUrl } from "../../../lib/auth/oauth.ts";

/**
 * Google OAuth initiation endpoint
 * Redirects user to Google OAuth consent screen
 */
export const handler: Handlers = {
  GET(req) {
    try {
      // Get return URL from query params (where to redirect after OAuth)
      const returnTo = new URL(req.url).searchParams.get("returnTo") ||
        "/dashboard";

      // Generate state token for CSRF protection (store returnTo in state)
      // In production, you'd want to use a proper session store or signed state
      // For now, we'll encode returnTo in the state
      const state = btoa(JSON.stringify({ returnTo }));

      // Generate Google OAuth URL
      const authUrl = getGoogleAuthUrl(req, state);

      // Redirect to Google OAuth
      return new Response(null, {
        status: 302,
        headers: {
          Location: authUrl,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Google OAuth initiation error:", message);
      return new Response(
        JSON.stringify({ error: "Failed to initiate Google OAuth" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
