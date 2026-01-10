/**
 * API endpoint for creating Stripe Customer Portal session
 *
 * Creates a Stripe Customer Portal session that allows users to manage
 * their subscription, update payment methods, and view billing history.
 */

import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { getAppBaseUrl, getStripeClient } from "../../../lib/stripe/client.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";
import { query } from "../../../lib/db.ts";

/**
 * API handler for creating Stripe Customer Portal session
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await requireAuthForApi(req);
      const stripe = getStripeClient();
      const baseUrl = getAppBaseUrl();

      // Get user's Stripe customer ID from preferences
      const result = await query<{
        preferences: Record<string, unknown>;
      }>(
        "SELECT preferences FROM users WHERE id = $1",
        [session.userId],
      );

      if (result.length === 0) {
        return createBadRequestResponse("User not found");
      }

      const preferences = result[0].preferences || {};
      const customerId = preferences.stripe_customer_id as string | undefined;

      if (!customerId) {
        return createBadRequestResponse(
          "No active subscription found. Please subscribe first.",
        );
      }

      // Create Customer Portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/settings`,
      });

      return new Response(
        JSON.stringify({
          url: portalSession.url,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error creating portal session:", error);
      return createInternalServerErrorResponse(
        "Failed to create portal session",
      );
    }
  },
};
