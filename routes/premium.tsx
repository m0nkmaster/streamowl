import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";
import PremiumPricingPage from "../islands/PremiumPricingPage.tsx";

interface PremiumPageProps {
  isAuthenticated: boolean;
  isPremium: boolean;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
}

/**
 * Premium pricing page route handler
 * Displays pricing options for premium subscription
 */
export const handler: Handlers<PremiumPageProps> = {
  async GET(req, ctx) {
    const session = await getSessionFromRequest(req);

    // Redirect to login if not authenticated
    if (!session) {
      const url = new URL(req.url);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?returnTo=${encodeURIComponent(url.pathname)}`,
        },
      });
    }

    // Check if user already has premium
    const { query } = await import("../lib/db.ts");
    const userResult = await query<{
      preferences: Record<string, unknown>;
    }>(
      "SELECT preferences FROM users WHERE id = $1",
      [session.userId],
    );

    const preferences = userResult[0]?.preferences || {};
    const isPremium = preferences.premium === true;

    // Get Stripe price IDs from environment
    const monthlyPriceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY") || null;
    const yearlyPriceId = Deno.env.get("STRIPE_PRICE_ID_YEARLY") || null;

    return ctx.render({
      isAuthenticated: true,
      isPremium,
      monthlyPriceId,
      yearlyPriceId,
    });
  },
};

export default function Premium({ data }: PageProps<PremiumPageProps>) {
  return <PremiumPricingPage {...data} />;
}
