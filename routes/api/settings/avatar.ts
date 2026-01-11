import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed MIME types for avatar images
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * API endpoint for managing user avatar
 * POST: Upload a new avatar (multipart/form-data)
 * DELETE: Remove the current avatar
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      // Parse multipart form data
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return createBadRequestResponse(
          "Request must be multipart/form-data",
          "contentType",
        );
      }

      const formData = await req.formData();
      const file = formData.get("avatar");

      if (!file || !(file instanceof File)) {
        return createBadRequestResponse(
          "No avatar file provided",
          "avatar",
        );
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return createBadRequestResponse(
          "Invalid file type. Allowed types: JPEG, PNG, GIF, WebP",
          "avatar",
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return createBadRequestResponse(
          "File too large. Maximum size is 2MB",
          "avatar",
        );
      }

      // Read file and convert to base64 data URL
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer)),
      );
      const dataUrl = `data:${file.type};base64,${base64}`;

      // Update user's avatar_url in database
      const result = await query<{ avatar_url: string }>(
        `UPDATE users 
         SET avatar_url = $1
         WHERE id = $2
         RETURNING avatar_url`,
        [dataUrl, session.userId],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      return new Response(
        JSON.stringify({
          success: true,
          avatarUrl: result[0].avatar_url,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error uploading avatar:", error);
      return createInternalServerErrorResponse("Failed to upload avatar");
    }
  },

  async DELETE(req) {
    try {
      const session = await requireAuthForApi(req);

      // Remove user's avatar_url from database
      const result = await query<{ avatar_url: string | null }>(
        `UPDATE users 
         SET avatar_url = NULL
         WHERE id = $1
         RETURNING avatar_url`,
        [session.userId],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      return new Response(
        JSON.stringify({
          success: true,
          avatarUrl: null,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error removing avatar:", error);
      return createInternalServerErrorResponse("Failed to remove avatar");
    }
  },
};
