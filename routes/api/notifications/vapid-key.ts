import { type Handlers } from "$fresh/server.ts";

/**
 * API endpoint to get the VAPID public key for push notifications
 * GET: Returns the public VAPID key needed for browser push subscription
 *
 * This endpoint is public (no auth required) as the key is needed
 * before the user subscribes to notifications.
 */
export const handler: Handlers = {
  GET() {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPublicKey) {
      return new Response(
        JSON.stringify({
          error: "Push notifications not configured",
          message:
            "VAPID keys have not been set up. Please contact support if you need push notifications.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        publicKey: vapidPublicKey,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          // Cache the public key for 1 hour
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  },
};
