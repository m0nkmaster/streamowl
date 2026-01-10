import { type Handlers } from "$fresh/server.ts";
import { query } from "../../lib/db.ts";
import { createPasswordResetToken } from "../../lib/auth/password-reset.ts";
import {
  generatePasswordResetUrl,
  sendPasswordResetEmail,
} from "../../lib/email/sender.ts";
import {
  createCsrfErrorResponse,
  validateCsrfToken,
} from "../../lib/security/csrf.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../lib/api/errors.ts";

/**
 * API handler for password reset requests
 * Generates a password reset token and sends email to user
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

      const email = formData.get("email")?.toString();

      // Validate input
      if (!email) {
        return createBadRequestResponse("Email is required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return createBadRequestResponse("Invalid email format", "email");
      }

      // Find user by email
      const users = await query<{ id: string }>(
        "SELECT id FROM users WHERE email = $1",
        [email.toLowerCase()],
      );

      // Always return success message to prevent user enumeration
      // Don't reveal whether email exists or not
      if (users.length > 0) {
        const user = users[0];

        // Generate password reset token
        const resetToken = await createPasswordResetToken(user.id, 24); // 24 hours expiry

        // Generate reset URL
        const url = new URL(req.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        const resetUrl = generatePasswordResetUrl(baseUrl, resetToken);

        // Send password reset email
        await sendPasswordResetEmail(email, resetToken, resetUrl);
      }

      // Always redirect to success page (don't reveal if email exists)
      const headers = new Headers();
      headers.set("Location", "/forgot-password?success=true");

      return new Response(null, {
        status: 303, // See Other (redirect after POST)
        headers,
      });
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to process password reset request",
        error,
      );
    }
  },
};
