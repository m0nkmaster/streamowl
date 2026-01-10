import { type Handlers } from "$fresh/server.ts";
import { query } from "../../lib/db.ts";
import { verifyPassword } from "../../lib/auth/password.ts";
import { createSessionToken } from "../../lib/auth/jwt.ts";
import { setSessionCookie } from "../../lib/auth/cookies.ts";

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
      const email = formData.get("email")?.toString();
      const password = formData.get("password")?.toString();

      // Validate input
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Email and password are required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
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
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await verifyPassword(
        password,
        user.password_hash,
      );

      if (!isValidPassword) {
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

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
      const message = error instanceof Error ? error.message : String(error);
      console.error("Login error:", message);
      return new Response(
        JSON.stringify({ error: "Failed to log in" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
