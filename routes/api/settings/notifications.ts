import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

interface NotificationPreferences {
  notifications_enabled: boolean;
  notification_new_releases: boolean;
  notification_recommendations: boolean;
  notification_watchlist_available: boolean;
}

/**
 * API endpoint for managing notification preferences
 * GET: Fetch user's notification preferences
 * POST: Update user's notification preferences
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);

      // Fetch user preferences
      const result = await query<{ preferences: Record<string, unknown> }>(
        "SELECT preferences FROM users WHERE id = $1",
        [session.userId],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const preferences = result[0].preferences || {};

      // Return notification preferences with defaults
      const notificationPrefs: NotificationPreferences = {
        notifications_enabled: preferences.notifications_enabled === true,
        notification_new_releases:
          preferences.notification_new_releases !== false, // Default to true
        notification_recommendations:
          preferences.notification_recommendations !== false, // Default to true
        notification_watchlist_available:
          preferences.notification_watchlist_available !== false, // Default to true
      };

      return new Response(JSON.stringify(notificationPrefs), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error fetching notification preferences:", error);
      return createInternalServerErrorResponse(
        "Failed to fetch notification preferences",
      );
    }
  },

  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      const body = await req.json();
      const {
        notificationNewReleases,
        notificationRecommendations,
        notificationWatchlistAvailable,
      } = body as {
        notificationNewReleases?: boolean;
        notificationRecommendations?: boolean;
        notificationWatchlistAvailable?: boolean;
      };

      // Validate inputs
      if (
        notificationNewReleases !== undefined &&
        typeof notificationNewReleases !== "boolean"
      ) {
        return createBadRequestResponse(
          "notificationNewReleases must be a boolean",
          "notificationNewReleases",
        );
      }

      if (
        notificationRecommendations !== undefined &&
        typeof notificationRecommendations !== "boolean"
      ) {
        return createBadRequestResponse(
          "notificationRecommendations must be a boolean",
          "notificationRecommendations",
        );
      }

      if (
        notificationWatchlistAvailable !== undefined &&
        typeof notificationWatchlistAvailable !== "boolean"
      ) {
        return createBadRequestResponse(
          "notificationWatchlistAvailable must be a boolean",
          "notificationWatchlistAvailable",
        );
      }

      // Build the update query dynamically based on provided fields
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (notificationNewReleases !== undefined) {
        updates.push(
          `preferences = jsonb_set(COALESCE(preferences, '{}'::jsonb), '{notification_new_releases}', $${paramIndex}::jsonb)`,
        );
        values.push(JSON.stringify(notificationNewReleases));
        paramIndex++;
      }

      if (notificationRecommendations !== undefined) {
        updates.push(
          `preferences = jsonb_set(COALESCE(preferences, '{}'::jsonb), '{notification_recommendations}', $${paramIndex}::jsonb)`,
        );
        values.push(JSON.stringify(notificationRecommendations));
        paramIndex++;
      }

      if (notificationWatchlistAvailable !== undefined) {
        updates.push(
          `preferences = jsonb_set(COALESCE(preferences, '{}'::jsonb), '{notification_watchlist_available}', $${paramIndex}::jsonb)`,
        );
        values.push(JSON.stringify(notificationWatchlistAvailable));
        paramIndex++;
      }

      if (updates.length === 0) {
        return createBadRequestResponse(
          "At least one notification preference must be provided",
          "body",
        );
      }

      // Execute each update in sequence to avoid nested jsonb_set issues
      for (let i = 0; i < updates.length; i++) {
        await query(
          `UPDATE users SET ${updates[i]} WHERE id = $${i + 2}`,
          [values[i], session.userId],
        );
      }

      // Fetch updated preferences
      const result = await query<{ preferences: Record<string, unknown> }>(
        "SELECT preferences FROM users WHERE id = $1",
        [session.userId],
      );

      if (result.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const preferences = result[0].preferences || {};

      const notificationPrefs: NotificationPreferences = {
        notifications_enabled: preferences.notifications_enabled === true,
        notification_new_releases:
          preferences.notification_new_releases !== false,
        notification_recommendations:
          preferences.notification_recommendations !== false,
        notification_watchlist_available:
          preferences.notification_watchlist_available !== false,
      };

      return new Response(
        JSON.stringify({
          success: true,
          ...notificationPrefs,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error updating notification preferences:", error);
      return createInternalServerErrorResponse(
        "Failed to update notification preferences",
      );
    }
  },
};
