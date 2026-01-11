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
  userProfile: {
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  notificationPreferences: {
    notificationsEnabled: boolean;
    newReleases: boolean;
    recommendations: boolean;
    watchlistAvailable: boolean;
  };
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

    // Get user profile and preferences
    const { query } = await import("../lib/db.ts");
    const userResult = await query<{
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      preferences: Record<string, unknown>;
    }>(
      "SELECT email, display_name, avatar_url, preferences FROM users WHERE id = $1",
      [session.userId],
    );

    const user = userResult[0];
    const preferences = user?.preferences || {};

    // Build user profile object
    const userProfile = {
      email: user?.email || "",
      displayName: user?.display_name || null,
      avatarUrl: user?.avatar_url || null,
    };
    const publicProfileEnabled = preferences.public_profile_enabled === true;
    const isPremium = preferences.premium === true;

    // Extract notification preferences with defaults (enabled by default)
    const notificationPreferences = {
      notificationsEnabled: preferences.notifications_enabled === true,
      newReleases: preferences.notification_new_releases !== false,
      recommendations: preferences.notification_recommendations !== false,
      watchlistAvailable:
        preferences.notification_watchlist_available !== false,
    };

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
      userProfile,
      notificationPreferences,
    });
  },
};

export default function Settings({ data }: PageProps<SettingsPageProps>) {
  return <SettingsPage {...data} />;
}
