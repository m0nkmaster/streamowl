import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

/**
 * Notification preference types
 * - new_releases: When content from watchlist becomes available on streaming services
 * - recommendations: Daily/weekly AI-powered recommendations
 * - leaving_soon: Content leaving streaming services soon
 * - weekly_digest: Weekly summary email of activity and recommendations
 */
export interface NotificationPreferences {
  new_releases: boolean;
  recommendations: boolean;
  leaving_soon: boolean;
  weekly_digest: boolean;
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  new_releases: true,
  recommendations: true,
  leaving_soon: true,
  weekly_digest: false,
};

/**
 * API endpoint for managing notification preferences
 * GET: Retrieve current notification preferences
 * POST: Update notification preferences
 */
export const handler: Handlers = {
  /**
   * Get the user's notification preferences
   */
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);

      // Fetch user preferences from database
      const result = await query<
        { preferences: Record<string, unknown> | null }
      >(
        `SELECT preferences FROM users WHERE id = $1`,
        [session.userId],
      );

      if (result.length === 0) {
        return createBadRequestResponse("User not found", "userId");
      }

      const preferences = result[0].preferences || {};
      const notificationPrefs = preferences.notification_types as
        | NotificationPreferences
        | undefined;

      // Return preferences merged with defaults
      const mergedPrefs: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...notificationPrefs,
      };

      return new Response(
        JSON.stringify({
          notification_types: mergedPrefs,
          notifications_enabled: preferences.notifications_enabled === true,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
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

  /**
   * Update the user's notification preferences
   */
  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      const body = await req.json();
      const { notification_types } = body as {
        notification_types: Partial<NotificationPreferences>;
      };

      if (!notification_types || typeof notification_types !== "object") {
        return createBadRequestResponse(
          "notification_types object is required",
          "notification_types",
        );
      }

      // Validate that all provided preferences are boolean
      const validKeys: (keyof NotificationPreferences)[] = [
        "new_releases",
        "recommendations",
        "leaving_soon",
        "weekly_digest",
      ];

      for (const [key, value] of Object.entries(notification_types)) {
        if (!validKeys.includes(key as keyof NotificationPreferences)) {
          return createBadRequestResponse(
            `Invalid notification type: ${key}`,
            `notification_types.${key}`,
          );
        }
        if (typeof value !== "boolean") {
          return createBadRequestResponse(
            `notification_types.${key} must be a boolean`,
            `notification_types.${key}`,
          );
        }
      }

      // Get current preferences
      const result = await query<
        { preferences: Record<string, unknown> | null }
      >(
        `SELECT preferences FROM users WHERE id = $1`,
        [session.userId],
      );

      if (result.length === 0) {
        return createBadRequestResponse("User not found", "userId");
      }

      const currentPrefs = result[0].preferences || {};
      const currentNotificationTypes =
        (currentPrefs.notification_types || {}) as Partial<
          NotificationPreferences
        >;

      // Merge new preferences with existing ones
      const updatedNotificationTypes: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...currentNotificationTypes,
        ...notification_types,
      };

      // Update the user's preferences
      await query(
        `UPDATE users 
         SET preferences = jsonb_set(
           COALESCE(preferences, '{}'::jsonb),
           '{notification_types}',
           $2::jsonb
         )
         WHERE id = $1`,
        [session.userId, JSON.stringify(updatedNotificationTypes)],
      );

      return new Response(
        JSON.stringify({
          success: true,
          notification_types: updatedNotificationTypes,
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
