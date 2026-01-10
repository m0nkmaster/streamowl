/**
 * API endpoint for creating Stripe checkout sessions
 *
 * Creates a Stripe Checkout session for premium subscription.
 * User is redirected to Stripe's hosted checkout page.
 */

import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { getAppBaseUrl, getStripeClient } from "../../../lib/stripe/client.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

/**
 * API handler for creating Stripe checkout session
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const session = await requireAuthForApi(req);
      const stripe = getStripeClient();
      const baseUrl = getAppBaseUrl();

      const body = await req.json().catch(() => ({}));
      const { priceId } = body;

      // Validate price ID
      if (!priceId || typeof priceId !== "string") {
        return createBadRequestResponse(
          "priceId is required and must be a string",
        );
      }

      // Create Stripe Checkout Session
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        customer_email: session.email,
        client_reference_id: session.userId,
        success_url: `${baseUrl}/settings?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/settings?canceled=true`,
        metadata: {
          userId: session.userId,
        },
      });

      return new Response(
        JSON.stringify({
          sessionId: checkoutSession.id,
          url: checkoutSession.url,
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
      console.error("Error creating checkout session:", error);
      return createInternalServerErrorResponse(
        "Failed to create checkout session",
      );
    }
  },
};
