import { type Handlers } from "$fresh/server.ts";
import { query, transaction } from "../../lib/db.ts";
import { hashPassword } from "../../lib/auth/password.ts";
import { createSessionToken } from "../../lib/auth/jwt.ts";
import { setSessionCookie } from "../../lib/auth/cookies.ts";
import {
  createCsrfErrorResponse,
  validateCsrfToken,
} from "../../lib/security/csrf.ts";
import {
  checkRateLimit,
  clearFailedAttempts,
  getClientIp,
  recordFailedAttempt,
} from "../../lib/security/rate-limit.ts";
import {
  createBadRequestResponse,
  createErrorResponse,
  createInternalServerErrorResponse,
  createTooManyRequestsResponse,
} from "../../lib/api/errors.ts";
import { createEmailVerificationToken } from "../../lib/auth/email-verification.ts";
import {
  generateVerificationUrl,
  sendVerificationEmail,
} from "../../lib/email/sender.ts";

interface SignupRequest {
  email: string;
  password: string;
}

/**
 * API handler for user signup
 * Creates a new user account with email and password
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
      const password = formData.get("password")?.toString();

      // Check rate limit before processing signup
      const clientIp = getClientIp(req);
      const rateLimitCheck = checkRateLimit(clientIp);
      if (rateLimitCheck.isBlocked) {
        return createTooManyRequestsResponse(
          "Too many signup attempts. Please try again later.",
          rateLimitCheck.remainingSeconds,
        );
      }

      // Validate input
      if (!email || !password) {
        return createBadRequestResponse("Email and password are required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return createBadRequestResponse("Invalid email format", "email");
      }

      // Validate password length
      if (password.length < 8) {
        return createBadRequestResponse(
          "Password must be at least 8 characters long",
          "password",
        );
      }

      // Check if user already exists
      const existingUsers = await query<{ id: string }>(
        "SELECT id FROM users WHERE email = $1",
        [email.toLowerCase()],
      );

      if (existingUsers.length > 0) {
        // Record failed attempt for duplicate email (potential abuse)
        recordFailedAttempt(clientIp);
        return createErrorResponse(
          409,
          "Conflict",
          "Email already registered",
        );
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);

      const newUser = await transaction(async (client) => {
        const result = await client.queryObject<{
          id: string;
          email: string;
        }>({
          text:
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
          args: [email.toLowerCase(), passwordHash],
        });

        return result.rows[0];
      });

      // Create session token
      const token = await createSessionToken(newUser.id, newUser.email);

      // Clear failed attempts on successful signup
      clearFailedAttempts(clientIp);

      // Send email verification
      const baseUrl = new URL(req.url).origin;
      const verificationToken = await createEmailVerificationToken(newUser.id);
      const verificationUrl = generateVerificationUrl(
        baseUrl,
        verificationToken,
      );
      sendVerificationEmail(newUser.email, verificationUrl);

      // Set session cookie and redirect to dashboard
      const headers = new Headers();
      setSessionCookie(headers, token);
      headers.set("Location", "/dashboard");

      return new Response(null, {
        status: 303, // See Other (redirect after POST)
        headers,
      });
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to create account",
        error,
      );
    }
  },
};
