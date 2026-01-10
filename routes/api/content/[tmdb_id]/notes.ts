import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../../lib/auth/middleware.ts";
import { getOrCreateContent } from "../../../../lib/content.ts";
import { query, transaction } from "../../../../lib/db.ts";
import {
  getMovieDetails,
  getTvDetails,
  type MovieDetails,
  type TvDetails,
} from "../../../../lib/tmdb/client.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createNotFoundResponse,
} from "../../../../lib/api/errors.ts";

/**
 * API endpoint for user notes on content
 *
 * GET /api/content/[tmdb_id]/notes
 * - Returns the user's notes for the content (or null if no notes)
 *
 * POST /api/content/[tmdb_id]/notes
 * - Saves or updates notes for the authenticated user
 * - Creates content record if it doesn't exist
 * - Creates or updates user_content record with notes
 */
export const handler: Handlers = {
  async GET(req, ctx) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Get TMDB ID from route params
      const { tmdb_id } = ctx.params;
      const tmdbId = parseInt(tmdb_id, 10);

      // Validate TMDB ID
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return createBadRequestResponse("Invalid content ID", "tmdb_id");
      }

      // Get content record
      const content = await query<{ id: string }>(
        "SELECT id FROM content WHERE tmdb_id = $1",
        [tmdbId],
      );

      if (content.length === 0) {
        // Content not in database yet, return null notes
        return new Response(
          JSON.stringify({ notes: null }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const contentId = content[0].id;

      // Get user_content notes
      const userContent = await query<{
        notes: string | null;
      }>(
        "SELECT notes FROM user_content WHERE user_id = $1 AND content_id = $2",
        [userId, contentId],
      );

      if (userContent.length === 0 || !userContent[0].notes) {
        return new Response(
          JSON.stringify({ notes: null }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          notes: userContent[0].notes,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to fetch notes",
        error,
      );
    }
  },

  async POST(req, ctx) {
    try {
      // Require authentication
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Get TMDB ID from route params
      const { tmdb_id } = ctx.params;
      const tmdbId = parseInt(tmdb_id, 10);

      // Validate TMDB ID
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return createBadRequestResponse("Invalid content ID", "tmdb_id");
      }

      // Parse request body
      const body = await req.json();
      const { notes } = body;

      // Validate notes
      if (notes !== null && typeof notes !== "string") {
        return createBadRequestResponse(
          "Notes must be a string or null",
          "notes",
        );
      }

      // Limit notes length (e.g., 10,000 characters)
      const maxLength = 10000;
      if (notes !== null && notes.length > maxLength) {
        return createBadRequestResponse(
          `Notes must be less than ${maxLength} characters`,
          "notes",
        );
      }

      // Normalise: empty string becomes null
      const normalisedNotes = notes === "" || notes === null ? null : notes;

      // Fetch content details from TMDB to determine type
      let tmdbDetails: MovieDetails | TvDetails;
      let contentType: "movie" | "tv";

      try {
        tmdbDetails = await getMovieDetails(tmdbId);
        contentType = "movie";
      } catch (_movieError) {
        try {
          tmdbDetails = await getTvDetails(tmdbId);
          contentType = "tv";
        } catch (_tvError) {
          return createNotFoundResponse("Content not found");
        }
      }

      // Get or create content record in database
      const contentId = await getOrCreateContent(tmdbDetails, contentType);

      // Save notes (upsert: insert or update if exists)
      await transaction(async (client) => {
        // Check if user_content record exists
        const existing = await client.queryObject<{ id: string }>(
          "SELECT id FROM user_content WHERE user_id = $1 AND content_id = $2",
          [userId, contentId],
        );

        if (existing.rows.length > 0) {
          // Update existing record with notes
          await client.queryObject(
            `UPDATE user_content 
             SET notes = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2 AND content_id = $3`,
            [normalisedNotes, userId, contentId],
          );
        } else {
          // Insert new record with notes (default status to 'watched' if no status set)
          await client.queryObject(
            `INSERT INTO user_content (user_id, content_id, status, notes)
             VALUES ($1, $2, 'watched', $3)`,
            [userId, contentId, normalisedNotes],
          );
        }
      });

      return new Response(
        JSON.stringify({ success: true, notes: normalisedNotes }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to save notes",
        error,
      );
    }
  },
};
