/**
 * Stripe client configuration and utilities
 *
 * Provides Stripe client instance and helper functions for subscription management.
 */

import Stripe from "stripe";

/**
 * Get Stripe secret key from environment variable
 */
function getStripeSecretKey(): string {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is not set. Please set it in your .env file or environment.",
    );
  }
  return secretKey;
}

/**
 * Get Stripe webhook secret from environment variable
 */
export function getStripeWebhookSecret(): string {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET environment variable is not set. Please set it in your .env file or environment.",
    );
  }
  return webhookSecret;
}

/**
 * Get application base URL from environment variable
 */
export function getAppBaseUrl(): string {
  const baseUrl = Deno.env.get("APP_BASE_URL");
  if (!baseUrl) {
    throw new Error(
      "APP_BASE_URL environment variable is not set. Please set it in your .env file or environment.",
    );
  }
  return baseUrl;
}

/**
 * Create and return Stripe client instance
 * Uses singleton pattern to reuse the same client instance
 */
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = getStripeSecretKey();
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return stripeClient;
}
