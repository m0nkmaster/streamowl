import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * API endpoint for managing push notification subscriptions
 * GET: Check if user has active subscription
 * POST: Subscribe to push notifications
 * DELETE: Unsubscribe from push notifications
 */
export const handler: Handlers = {
  /**
   * Check if the user has an active push subscription
   */
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);

      // Check for active subscriptions
      const result = await query<{ endpoint: string; created_at: string }>(
        `SELECT endpoint, created_at FROM push_subscriptions 
         WHERE user_id = $1 AND is_active = true 
         LIMIT 1`,
        [session.userId],
      );

      return new Response(
        JSON.stringify({
          subscribed: result.length > 0,
          subscriptionCount: result.length,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error checking subscription:", error);
      return createInternalServerErrorResponse("Failed to check subscription");
    }
  },

  /**
   * Subscribe to push notifications
   */
  async POST(req) {
    try {
      const session = await requireAuthForApi(req);

      const body = await req.json();
      const { subscription, resubscribe } = body as {
        subscription: PushSubscription;
        resubscribe?: boolean;
      };

      // Validate subscription
      if (!subscription?.endpoint) {
        return createBadRequestResponse(
          "Subscription endpoint is required",
          "subscription.endpoint",
        );
      }

      if (!subscription?.keys?.p256dh) {
        return createBadRequestResponse(
          "Subscription p256dh key is required",
          "subscription.keys.p256dh",
        );
      }

      if (!subscription?.keys?.auth) {
        return createBadRequestResponse(
          "Subscription auth key is required",
          "subscription.keys.auth",
        );
      }

      // Get user agent for device identification
      const userAgent = req.headers.get("user-agent") || null;

      // Upsert subscription (update if endpoint exists, insert if not)
      const result = await query<{ id: string }>(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (endpoint) 
         DO UPDATE SET 
           user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent,
           is_active = true,
           created_at = CASE 
             WHEN push_subscriptions.user_id != EXCLUDED.user_id 
             THEN CURRENT_TIMESTAMP 
             ELSE push_subscriptions.created_at 
           END
         RETURNING id`,
        [
          session.userId,
          subscription.endpoint,
          subscription.keys.p256dh,
          subscription.keys.auth,
          userAgent,
        ],
      );

      // Update user preferences to indicate notifications are enabled
      await query(
        `UPDATE users 
         SET preferences = jsonb_set(
           COALESCE(preferences, '{}'::jsonb),
           '{notifications_enabled}',
           'true'::jsonb
         )
         WHERE id = $1`,
        [session.userId],
      );

      return new Response(
        JSON.stringify({
          success: true,
          subscriptionId: result[0]?.id,
          message: resubscribe
            ? "Subscription renewed successfully"
            : "Subscribed to notifications",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error subscribing to notifications:", error);
      return createInternalServerErrorResponse(
        "Failed to subscribe to notifications",
      );
    }
  },

  /**
   * Unsubscribe from push notifications
   */
  async DELETE(req) {
    try {
      const session = await requireAuthForApi(req);

      // Check for endpoint in query params or body
      const url = new URL(req.url);
      let endpoint = url.searchParams.get("endpoint");

      if (!endpoint && req.headers.get("content-type")?.includes("json")) {
        try {
          const body = await req.json();
          endpoint = body.endpoint;
        } catch {
          // Ignore body parsing errors
        }
      }

      if (endpoint) {
        // Delete specific subscription
        await query(
          `UPDATE push_subscriptions 
           SET is_active = false 
           WHERE user_id = $1 AND endpoint = $2`,
          [session.userId, endpoint],
        );
      } else {
        // Delete all subscriptions for user
        await query(
          `UPDATE push_subscriptions 
           SET is_active = false 
           WHERE user_id = $1`,
          [session.userId],
        );
      }

      // Update user preferences
      await query(
        `UPDATE users 
         SET preferences = jsonb_set(
           COALESCE(preferences, '{}'::jsonb),
           '{notifications_enabled}',
           'false'::jsonb
         )
         WHERE id = $1`,
        [session.userId],
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Unsubscribed from notifications",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error unsubscribing from notifications:", error);
      return createInternalServerErrorResponse(
        "Failed to unsubscribe from notifications",
      );
    }
  },
};
