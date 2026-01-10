import { type Handlers } from "$fresh/server.ts";
import { query } from "../../lib/db.ts";
import { verifyPassword } from "../../lib/auth/password.ts";
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
  createInternalServerErrorResponse,
  createTooManyRequestsResponse,
  createUnauthorizedResponse,
} from "../../lib/api/errors.ts";

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * API handler for user login
 * Authenticates existing users with email and password
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

      // Check rate limit before processing authentication
      const clientIp = getClientIp(req);
      const rateLimitCheck = checkRateLimit(clientIp);
      if (rateLimitCheck.isBlocked) {
        return createTooManyRequestsResponse(
          "Too many failed login attempts. Please try again later.",
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

      // Find user by email
      const users = await query<{
        id: string;
        email: string;
        password_hash: string;
      }>(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        [email.toLowerCase()],
      );

      if (users.length === 0) {
        // Record failed attempt for invalid email
        recordFailedAttempt(clientIp);
        return createUnauthorizedResponse("Invalid email or password");
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await verifyPassword(
        password,
        user.password_hash,
      );

      if (!isValidPassword) {
        // Record failed attempt for invalid password
        recordFailedAttempt(clientIp);
        return createUnauthorizedResponse("Invalid email or password");
      }

      // Clear failed attempts on successful login
      clearFailedAttempts(clientIp);

      // Create session token
      const token = await createSessionToken(user.id, user.email);

      // Get return URL from form data or default to dashboard
      const returnTo = formData.get("returnTo")?.toString() || "/dashboard";

      // Validate returnTo to prevent open redirects (must be relative path)
      const returnUrl = returnTo.startsWith("/") ? returnTo : "/dashboard";

      // Set session cookie and redirect to return URL
      const headers = new Headers();
      setSessionCookie(headers, token);
      headers.set("Location", returnUrl);

      return new Response(null, {
        status: 303, // See Other (redirect after POST)
        headers,
      });
    } catch (error) {
      return createInternalServerErrorResponse("Failed to log in", error);
    }
  },
};
