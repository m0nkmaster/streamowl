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
import {
  getStripeClient,
  getStripeWebhookSecret,
} from "../../../lib/stripe/client.ts";
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
 * Update user subscription details in database
 */
async function updateSubscriptionDetails(
  userId: string,
  customerId: string,
  subscriptionId: string,
  currentPeriodEnd: number,
  planName: string | null,
): Promise<void> {
  await query(
    `UPDATE users 
     SET preferences = jsonb_set(
       jsonb_set(
         jsonb_set(
           jsonb_set(
             COALESCE(preferences, '{}'::jsonb),
             '{stripe_customer_id}',
             $1::jsonb
           ),
           '{stripe_subscription_id}',
           $2::jsonb
         ),
         '{subscription_current_period_end}',
         $3::jsonb
       ),
       '{subscription_plan_name}',
       $4::jsonb
     )
     WHERE id = $5`,
    [
      JSON.stringify(customerId),
      JSON.stringify(subscriptionId),
      JSON.stringify(currentPeriodEnd),
      planName ? JSON.stringify(planName) : "null",
      userId,
    ],
  );
}

/**
 * Clear subscription details when subscription is cancelled
 */
async function clearSubscriptionDetails(userId: string): Promise<void> {
  await query(
    `UPDATE users 
     SET preferences = preferences 
       - 'stripe_customer_id' 
       - 'stripe_subscription_id' 
       - 'subscription_current_period_end' 
       - 'subscription_plan_name'
     WHERE id = $1`,
    [userId],
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
          if (session.mode === "subscription" && session.subscription) {
            await updatePremiumStatus(userId, true);

            // Retrieve subscription to get details
            const subscriptionId = typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId,
            );

            const customerId = typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id;

            // Get plan name from subscription items
            const planName = subscription.items.data[0]?.price.nickname ||
              subscription.items.data[0]?.price.id || null;

            await updateSubscriptionDetails(
              userId,
              customerId,
              subscriptionId,
              subscription.current_period_end,
              planName,
            );

            // Ensure customer metadata has userId for future lookups
            const customerIdForMetadata =
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer.id;
            await stripe.customers.update(customerIdForMetadata, {
              metadata: { userId },
            });

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

          if (isActive) {
            const customerId = typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id;

            const planName = subscription.items.data[0]?.price.nickname ||
              subscription.items.data[0]?.price.id || null;

            await updateSubscriptionDetails(
              userId,
              customerId,
              subscription.id,
              subscription.current_period_end,
              planName,
            );
          }

          console.log(
            `Premium status updated for user ${userId}: ${isActive}`,
          );
          break;
        }

        case "customer.subscription.deleted": {
          await updatePremiumStatus(userId, false);
          await clearSubscriptionDetails(userId);
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
