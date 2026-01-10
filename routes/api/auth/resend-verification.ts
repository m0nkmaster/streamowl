import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import {
  isEmailVerified,
  resendEmailVerification,
} from "../../../lib/auth/email-verification.ts";
import {
  generateVerificationUrl,
  sendVerificationEmail,
} from "../../../lib/email/sender.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

/**
 * API handler for resending email verification
 * Requires authentication
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      // Check if email is already verified
      const verified = await isEmailVerified(session.userId);
      if (verified) {
        return createBadRequestResponse("Email is already verified");
      }

      // Get user's email address
      const users = await query<{ email: string }>(
        `SELECT email FROM users WHERE id = $1`,
        [session.userId],
      );

      if (users.length === 0) {
        return createBadRequestResponse("User not found");
      }

      // Create new verification token and send email
      const baseUrl = new URL(req.url).origin;
      const verificationToken = await resendEmailVerification(session.userId);
      const verificationUrl = generateVerificationUrl(
        baseUrl,
        verificationToken,
      );
      sendVerificationEmail(users[0].email, verificationUrl);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Verification email sent",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      return createInternalServerErrorResponse(
        "Failed to resend verification email",
        error,
      );
    }
  },
};
