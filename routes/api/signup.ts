import { type Handlers } from "$fresh/server.ts";
import { query, transaction } from "../../lib/db.ts";
import { hashPassword } from "../../lib/auth/password.ts";
import { createSessionToken } from "../../lib/auth/jwt.ts";
import { setSessionCookie } from "../../lib/auth/cookies.ts";

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

      // Validate password length
      if (password.length < 8) {
        return new Response(
          JSON.stringify({
            error: "Password must be at least 8 characters long",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Check if user already exists
      const existingUsers = await query<{ id: string }>(
        "SELECT id FROM users WHERE email = $1",
        [email.toLowerCase()],
      );

      if (existingUsers.length > 0) {
        return new Response(
          JSON.stringify({ error: "Email already registered" }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          },
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

      // Set session cookie and redirect to dashboard
      const headers = new Headers();
      setSessionCookie(headers, token);
      headers.set("Location", "/dashboard");

      return new Response(null, {
        status: 303, // See Other (redirect after POST)
        headers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Signup error:", message);
      return new Response(
        JSON.stringify({ error: "Failed to create account" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
