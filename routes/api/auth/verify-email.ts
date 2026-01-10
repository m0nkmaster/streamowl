import { type Handlers } from "$fresh/server.ts";
import { verifyEmail } from "../../../lib/auth/email-verification.ts";
import { createBadRequestResponse } from "../../../lib/api/errors.ts";

/**
 * API handler for email verification
 * Verifies email when user clicks the verification link
 */
export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return createBadRequestResponse("Verification token is required");
    }

    const success = await verifyEmail(token);

    if (!success) {
      // Redirect to an error page or show error message
      const headers = new Headers();
      headers.set(
        "Location",
        "/login?error=invalid_or_expired_verification_token",
      );
      return new Response(null, {
        status: 303,
        headers,
      });
    }

    // Redirect to dashboard with success message
    const headers = new Headers();
    headers.set("Location", "/dashboard?verified=true");
    return new Response(null, {
      status: 303,
      headers,
    });
  },
};
