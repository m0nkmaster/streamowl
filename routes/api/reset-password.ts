import { type Handlers } from "$fresh/server.ts";
import { query } from "../../lib/db.ts";
import { hashPassword } from "../../lib/auth/password.ts";
import {
  invalidateUserPasswordResetTokens,
  markPasswordResetTokenAsUsed,
  validatePasswordResetToken,
} from "../../lib/auth/password-reset.ts";
import {
  createCsrfErrorResponse,
  validateCsrfToken,
} from "../../lib/security/csrf.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../lib/api/errors.ts";

/**
 * API handler for password reset
 * Validates token and updates user password
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const formData = await req.formData();

      // Validate CSRF token
      const isValidCsrf = await validateCsrfToken(req, formData);
      if (!isValidCsrf) {
        return createCsrfErrorResponse();
      }

      const token = formData.get("token")?.toString();
      const password = formData.get("password")?.toString();
      const confirmPassword = formData.get("confirmPassword")?.toString();

      // Validate input
      if (!token) {
        return createBadRequestResponse("Reset token is required");
      }

      if (!password || !confirmPassword) {
        return createBadRequestResponse(
          "Password and confirmation are required",
        );
      }

      // Validate password length
      if (password.length < 8) {
        return createBadRequestResponse(
          "Password must be at least 8 characters long",
          "password",
        );
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        return createBadRequestResponse(
          "Passwords do not match",
          "confirmPassword",
        );
      }

      // Validate reset token
      const userId = await validatePasswordResetToken(token);
      if (!userId) {
        const headers = new Headers();
        headers.set(
          "Location",
          "/reset-password?token=" +
            encodeURIComponent(token) +
            "&error=Invalid+or+expired+reset+link",
        );
        return new Response(null, {
          status: 303,
          headers,
        });
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update user password and invalidate all reset tokens
      await query(
        `UPDATE users SET password_hash = $1 WHERE id = $2`,
        [passwordHash, userId],
      );

      // Mark token as used and invalidate all other tokens for this user
      await markPasswordResetTokenAsUsed(token);
      await invalidateUserPasswordResetTokens(userId);

      // Redirect to login with success message
      const headers = new Headers();
      headers.set("Location", "/login?reset=success");

      return new Response(null, {
        status: 303, // See Other (redirect after POST)
        headers,
      });
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to reset password",
        error,
      );
    }
  },
};
