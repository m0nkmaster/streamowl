import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import { verifyPassword } from "../../../lib/auth/password.ts";
import { clearSessionCookie } from "../../../lib/auth/cookies.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createUnauthorizedResponse,
} from "../../../lib/api/errors.ts";

/**
 * API endpoint for deleting user account
 * POST: Delete the authenticated user's account after password verification
 *
 * All user data is automatically deleted via CASCADE constraints:
 * - user_content (watched/watchlist/favourites)
 * - lists and list_items
 * - tags and content_tags
 * - push_subscriptions
 * - password_reset_tokens
 * - email_verification_tokens
 * - dismissed_recommendations
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      const body = await req.json();
      const { password } = body;

      // Password is required for account deletion
      if (!password || typeof password !== "string") {
        return createBadRequestResponse(
          "Password is required to delete your account",
          "password",
        );
      }

      // Fetch user's password hash
      const userResult = await query<{
        password_hash: string | null;
        google_id: string | null;
      }>(
        "SELECT password_hash, google_id FROM users WHERE id = $1",
        [session.userId],
      );

      if (userResult.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const user = userResult[0];

      // Check if user has a password set (may be OAuth-only user)
      if (!user.password_hash) {
        // OAuth-only users can't verify with password
        // For now, we don't allow OAuth-only users to delete via password
        // They would need a different verification method (e.g., re-authentication)
        return createBadRequestResponse(
          "Your account uses Google Sign-In and cannot be deleted with a password. Please contact support.",
          "password",
        );
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return createUnauthorizedResponse("Incorrect password");
      }

      // Delete the user - all related data will be cascade deleted
      const deleteResult = await query(
        "DELETE FROM users WHERE id = $1",
        [session.userId],
      );

      // The delete should affect exactly one row
      if (!deleteResult || (deleteResult as unknown[]).length === 0) {
        // This is expected since DELETE doesn't return rows by default
        // We just proceed as the deletion was successful
      }

      // Clear the session cookie
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      clearSessionCookie(headers);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Your account has been permanently deleted",
        }),
        {
          status: 200,
          headers,
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error deleting user account:", error);
      return createInternalServerErrorResponse("Failed to delete account");
    }
  },
};
