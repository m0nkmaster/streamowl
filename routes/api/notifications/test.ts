import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";
import { sendPushNotification } from "../../../lib/notifications/push.ts";

/**
 * API endpoint for sending test push notifications
 * POST: Send a test notification to the current user
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      // Get the user's active push subscriptions
      const subscriptions = await query<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }>(
        `SELECT id, endpoint, p256dh, auth 
         FROM push_subscriptions 
         WHERE user_id = $1 AND is_active = true`,
        [session.userId],
      );

      if (subscriptions.length === 0) {
        return createBadRequestResponse(
          "No active push subscriptions found. Please enable notifications first.",
          "subscription",
        );
      }

      // Prepare test notification payload
      const payload = {
        title: "Stream Owl Test Notification",
        body:
          "Push notifications are working! You'll receive updates about new releases and recommendations.",
        icon: "/logo.svg",
        badge: "/logo.svg",
        tag: "test-notification",
        url: "/dashboard",
        type: "test",
      };

      // Send to all active subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await sendPushNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload,
            );

            // Update last push timestamp
            await query(
              `UPDATE push_subscriptions SET last_push_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [sub.id],
            );

            return { success: true, subscriptionId: sub.id };
          } catch (error) {
            // If subscription is invalid (410 Gone or 404), mark as inactive
            if (
              error instanceof Error &&
              (error.message.includes("410") || error.message.includes("404"))
            ) {
              await query(
                `UPDATE push_subscriptions SET is_active = false WHERE id = $1`,
                [sub.id],
              );
            }
            throw error;
          }
        }),
      );

      // Count successes and failures
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (successful === 0) {
        return createInternalServerErrorResponse(
          "Failed to send notification to any device. Your subscriptions may have expired.",
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Test notification sent to ${successful} device(s)`,
          devicesReached: successful,
          devicesFailed: failed,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error sending test notification:", error);
      return createInternalServerErrorResponse(
        "Failed to send test notification",
      );
    }
  },
};
