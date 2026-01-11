import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { verifyPassword } from "../../../lib/auth/password.ts";
import { clearSessionCookie } from "../../../lib/auth/cookies.ts";
import { query, transaction } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createUnauthorizedResponse,
} from "../../../lib/api/errors.ts";

interface UserRecord {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
}

/**
 * API endpoint for account deletion
 * DELETE: Delete the user's account and all associated data
 *
 * For password-based accounts: requires password confirmation
 * For OAuth-only accounts: requires email confirmation
 */
export const handler: Handlers = {
  async DELETE(req) {
    try {
      const session = await requireAuthForApi(req);

      const body = await req.json();
      const { password, confirmEmail } = body;

      // Fetch user details to determine account type
      const users = await query<UserRecord>(
        "SELECT id, email, password_hash, google_id FROM users WHERE id = $1",
        [session.userId],
      );

      if (users.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const user = users[0];

      // Determine account type and validate confirmation
      const hasPassword = !!user.password_hash;
      const isOAuthOnly = !hasPassword && !!user.google_id;

      if (hasPassword) {
        // Password-based account: require password confirmation
        if (!password || typeof password !== "string") {
          return createBadRequestResponse(
            "Password is required to delete your account",
            "password",
          );
        }

        const isValid = await verifyPassword(password, user.password_hash!);
        if (!isValid) {
          return createUnauthorizedResponse("Incorrect password");
        }
      } else if (isOAuthOnly) {
        // OAuth-only account: require email confirmation
        if (!confirmEmail || typeof confirmEmail !== "string") {
          return createBadRequestResponse(
            "Please enter your email address to confirm deletion",
            "confirmEmail",
          );
        }

        if (confirmEmail.toLowerCase().trim() !== user.email.toLowerCase()) {
          return createBadRequestResponse(
            "Email address does not match",
            "confirmEmail",
          );
        }
      } else {
        // Edge case: user has neither password nor OAuth (shouldn't happen)
        // Fall back to email confirmation
        if (!confirmEmail || typeof confirmEmail !== "string") {
          return createBadRequestResponse(
            "Please enter your email address to confirm deletion",
            "confirmEmail",
          );
        }

        if (confirmEmail.toLowerCase().trim() !== user.email.toLowerCase()) {
          return createBadRequestResponse(
            "Email address does not match",
            "confirmEmail",
          );
        }
      }

      // Delete the user - CASCADE will remove all related data
      await transaction(async (client) => {
        await client.queryObject(
          "DELETE FROM users WHERE id = $1",
          [session.userId],
        );
      });

      // Clear session cookie
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      clearSessionCookie(headers);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Your account has been deleted successfully",
        }),
        { headers },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error deleting account:", error);
      return createInternalServerErrorResponse("Failed to delete account");
    }
  },

  /**
   * GET: Check account type to determine what confirmation is needed
   */
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);

      // Fetch user details
      const users = await query<UserRecord>(
        "SELECT id, email, password_hash, google_id FROM users WHERE id = $1",
        [session.userId],
      );

      if (users.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const user = users[0];
      const hasPassword = !!user.password_hash;
      const isOAuthOnly = !hasPassword && !!user.google_id;

      return new Response(
        JSON.stringify({
          email: user.email,
          requiresPassword: hasPassword,
          requiresEmailConfirmation: !hasPassword,
          isOAuthOnly,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error checking account type:", error);
      return createInternalServerErrorResponse("Failed to check account type");
    }
  },
};
