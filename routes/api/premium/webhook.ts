/**
 * Stripe webhook endpoint for handling subscription events
 *
 * Handles Stripe webhook events to update user premium status:
 * - checkout.session.completed: User completed checkout
 * - customer.subscription.created: Subscription created
 * - customer.subscription.updated: Subscription updated (e.g., plan change)
 * - customer.subscription.deleted: Subscription cancelled
 * - invoice.payment_succeeded: Successful payment
 * - invoice.payment_failed: Failed payment
 */

import { type Handlers } from "$fresh/server.ts";
import { getStripeClient, getStripeWebhookSecret } from "../../../lib/stripe/client.ts";
import { query } from "../../../lib/db.ts";
import { createInternalServerErrorResponse } from "../../../lib/api/errors.ts";
import Stripe from "stripe";

/**
 * Update user premium status in database
 */
async function updatePremiumStatus(
  userId: string,
  isPremium: boolean,
): Promise<void> {
  await query(
    `UPDATE users 
     SET preferences = jsonb_set(
       COALESCE(preferences, '{}'::jsonb),
       '{premium}',
       $1::jsonb
     )
     WHERE id = $2`,
    [JSON.stringify(isPremium), userId],
  );
}

/**
 * Get user ID from Stripe event metadata or customer
 */
async function getUserIdFromEvent(
  event: Stripe.Event,
): Promise<string | null> {
  // Try to get userId from metadata
  if (event.data.object && "metadata" in event.data.object) {
    const metadata = event.data.object.metadata as Record<string, unknown>;
    if (metadata.userId && typeof metadata.userId === "string") {
      return metadata.userId;
    }
  }

  // For checkout.session.completed, get from client_reference_id
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.client_reference_id) {
      return session.client_reference_id;
    }
  }

  // For subscription events, get from customer metadata
  if (
    event.type.startsWith("customer.subscription.") ||
    event.type.startsWith("invoice.")
  ) {
    const subscription = event.data.object as
      | Stripe.Subscription
      | Stripe.Invoice;
    if (subscription.customer) {
      const customerId = typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

      // Retrieve customer to get metadata
      const stripe = getStripeClient();
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && customer.metadata?.userId) {
        return customer.metadata.userId;
      }
    }
  }

  return null;
}

/**
 * API handler for Stripe webhook events
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const stripe = getStripeClient();
      const webhookSecret = getStripeWebhookSecret();

      // Get raw body for signature verification
      const body = await req.text();
      const signature = req.headers.get("stripe-signature");

      if (!signature) {
        return new Response("Missing stripe-signature header", {
          status: 400,
        });
      }

      // Verify webhook signature
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecret,
        );
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response("Invalid signature", { status: 400 });
      }

      // Handle different event types
      const userId = await getUserIdFromEvent(event);
      if (!userId) {
        console.warn("Could not determine userId from event:", event.type);
        // Return 200 to acknowledge receipt even if we can't process
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === "subscription") {
            await updatePremiumStatus(userId, true);
            console.log(`Premium activated for user ${userId}`);
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const isActive = subscription.status === "active" ||
            subscription.status === "trialing";
          await updatePremiumStatus(userId, isActive);
          console.log(
            `Premium status updated for user ${userId}: ${isActive}`,
          );
          break;
        }

        case "customer.subscription.deleted": {
          await updatePremiumStatus(userId, false);
          console.log(`Premium cancelled for user ${userId}`);
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription) {
            await updatePremiumStatus(userId, true);
            console.log(`Premium confirmed for user ${userId} after payment`);
          }
          break;
        }

        case "invoice.payment_failed": {
          // Optionally downgrade user if payment fails multiple times
          // For now, we'll keep premium status but could add logic here
          console.log(`Payment failed for user ${userId}`);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return createInternalServerErrorResponse("Webhook processing failed");
    }
  },
};
