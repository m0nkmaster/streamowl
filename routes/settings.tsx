import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";
import { getUserRegion } from "../lib/region.ts";
import SettingsPage from "../islands/SettingsPage.tsx";

interface SettingsPageProps {
  isAuthenticated: boolean;
  currentRegion: string;
  detectedRegion: string;
  publicProfileEnabled: boolean;
  userId: string;
  checkoutSuccess: boolean;
  checkoutCanceled: boolean;
  isPremium: boolean;
  subscriptionDetails: {
    planName: string | null;
    currentPeriodEnd: number | null;
    customerId: string | null;
  } | null;
}

/**
 * Settings page route handler
 * Displays user settings including region preference
 */
export const handler: Handlers<SettingsPageProps> = {
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

    // Get current user region (preference or detected)
    const currentRegion = await getUserRegion(req, session);

    // Get detected region (without preference)
    const detectedRegion = await getUserRegion(req, null);

    // Get user preferences to check public profile setting and subscription
    const { query } = await import("../lib/db.ts");
    const userResult = await query<{
      preferences: Record<string, unknown>;
    }>(
      "SELECT preferences FROM users WHERE id = $1",
      [session.userId],
    );

    const preferences = userResult[0]?.preferences || {};
    const publicProfileEnabled = preferences.public_profile_enabled === true;
    const isPremium = preferences.premium === true;

    // Get subscription details if user has premium
    let subscriptionDetails = null;
    if (isPremium) {
      subscriptionDetails = {
        planName: preferences.subscription_plan_name as string | null || null,
        currentPeriodEnd: preferences.subscription_current_period_end as
          | number
          | null || null,
        customerId: preferences.stripe_customer_id as string | null || null,
      };
    }

    // Check for Stripe checkout redirect parameters
    const url = new URL(req.url);
    const checkoutSuccess = url.searchParams.has("session_id");
    const checkoutCanceled = url.searchParams.get("canceled") === "true";

    return ctx.render({
      isAuthenticated: true,
      currentRegion,
      detectedRegion,
      publicProfileEnabled,
      userId: session.userId,
      checkoutSuccess,
      checkoutCanceled,
      isPremium,
      subscriptionDetails,
    });
  },
};

export default function Settings({ data }: PageProps<SettingsPageProps>) {
  return <SettingsPage {...data} />;
}
