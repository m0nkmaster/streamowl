import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

interface UserProfile {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * API endpoint for managing user profile
 * GET: Fetch user's profile (email, display_name, avatar_url)
 * POST: Update user's profile (display_name only - email and avatar via other endpoints)
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);

      // Fetch user profile
      const result = await query<UserProfile>(
        "SELECT email, display_name, avatar_url FROM users WHERE id = $1",
        [session.userId],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const user = result[0];

      return new Response(
        JSON.stringify({
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error fetching user profile:", error);
      return createInternalServerErrorResponse("Failed to fetch user profile");
    }
  },

  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      const body = await req.json();
      const { displayName } = body;

      // Validate display name
      if (displayName !== undefined && displayName !== null) {
        if (typeof displayName !== "string") {
          return createBadRequestResponse(
            "Display name must be a string",
            "displayName",
          );
        }

        // Trim and validate length
        const trimmed = displayName.trim();
        if (trimmed.length > 255) {
          return createBadRequestResponse(
            "Display name must be 255 characters or fewer",
            "displayName",
          );
        }
      }

      // Update user profile
      const result = await query<UserProfile>(
        `UPDATE users 
         SET display_name = $1
         WHERE id = $2
         RETURNING email, display_name, avatar_url`,
        [
          displayName !== undefined && displayName !== null
            ? displayName.trim() || null
            : null,
          session.userId,
        ],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const user = result[0];

      return new Response(
        JSON.stringify({
          success: true,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error updating user profile:", error);
      return createInternalServerErrorResponse(
        "Failed to update user profile",
      );
    }
  },
};
