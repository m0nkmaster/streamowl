import { type Handlers } from "$fresh/server.ts";
import {
  exchangeCodeForToken,
  getGoogleUserProfile,
} from "../../../../lib/auth/oauth.ts";
import { query, transaction } from "../../../../lib/db.ts";
import { createSessionToken } from "../../../../lib/auth/jwt.ts";
import { setSessionCookie } from "../../../../lib/auth/cookies.ts";

/**
 * Google OAuth callback endpoint
 * Handles the OAuth callback from Google and creates/logs in the user
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      // Handle OAuth errors
      if (error) {
        console.error("Google OAuth error:", error);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/login?error=oauth_failed",
          },
        });
      }

      // Validate code is present
      if (!code) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/login?error=missing_code",
          },
        });
      }

      // Parse state to get return URL
      let returnTo = "/dashboard";
      if (state) {
        try {
          const stateData = JSON.parse(atob(state));
          if (stateData.returnTo && typeof stateData.returnTo === "string") {
            // Validate returnTo to prevent open redirects
            if (stateData.returnTo.startsWith("/")) {
              returnTo = stateData.returnTo;
            }
          }
        } catch {
          // Invalid state, use default
        }
      }

      // Exchange authorization code for access token
      const { access_token } = await exchangeCodeForToken(code, req);

      // Get user profile from Google
      const googleProfile = await getGoogleUserProfile(access_token);

      // Validate email is verified
      if (!googleProfile.verified_email) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/login?error=email_not_verified",
          },
        });
      }

      // Check if user exists by Google ID or email
      const existingUsers = await query<{
        id: string;
        email: string;
        google_id: string | null;
      }>(
        "SELECT id, email, google_id FROM users WHERE google_id = $1 OR email = $2",
        [googleProfile.id, googleProfile.email.toLowerCase()],
      );

      let userId: string;
      let userEmail: string;

      if (existingUsers.length > 0) {
        // User exists - update Google ID if not set and log them in
        const user = existingUsers[0];
        userId = user.id;
        userEmail = user.email;

        // If user doesn't have google_id set, update it
        if (!user.google_id) {
          await query(
            "UPDATE users SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [googleProfile.id, userId],
          );
        }

        // Update display name and avatar if available and not set
        if (googleProfile.name || googleProfile.picture) {
          const updates: string[] = [];
          const args: unknown[] = [];
          let argIndex = 1;

          if (googleProfile.name) {
            updates.push(`display_name = $${argIndex++}`);
            args.push(googleProfile.name);
          }
          if (googleProfile.picture) {
            updates.push(`avatar_url = $${argIndex++}`);
            args.push(googleProfile.picture);
          }

          if (updates.length > 0) {
            args.push(userId);
            await query(
              `UPDATE users SET ${
                updates.join(", ")
              }, updated_at = CURRENT_TIMESTAMP WHERE id = $${argIndex}`,
              args,
            );
          }
        }
      } else {
        // New user - create account
        const newUser = await transaction(async (client) => {
          const result = await client.queryObject<{
            id: string;
            email: string;
          }>({
            text:
              `INSERT INTO users (email, google_id, display_name, avatar_url)
                   VALUES ($1, $2, $3, $4)
                   RETURNING id, email`,
            args: [
              googleProfile.email.toLowerCase(),
              googleProfile.id,
              googleProfile.name || null,
              googleProfile.picture || null,
            ],
          });

          return result.rows[0];
        });

        userId = newUser.id;
        userEmail = newUser.email;
      }

      // Create session token
      const token = await createSessionToken(userId, userEmail);

      // Set session cookie and redirect
      const headers = new Headers();
      setSessionCookie(headers, token);
      headers.set("Location", returnTo);

      return new Response(null, {
        status: 303, // See Other (redirect after GET)
        headers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Google OAuth callback error:", message);
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/login?error=oauth_callback_failed",
        },
      });
    }
  },
};
