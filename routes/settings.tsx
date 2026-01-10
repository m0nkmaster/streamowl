import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";
import { getUserRegion, getRegionName } from "../lib/region.ts";
import SettingsPage from "../islands/SettingsPage.tsx";

interface SettingsPageProps {
  isAuthenticated: boolean;
  currentRegion: string;
  detectedRegion: string;
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

    return ctx.render({
      isAuthenticated: true,
      currentRegion,
      detectedRegion,
    });
  },
};

export default function Settings({ data }: PageProps<SettingsPageProps>) {
  return <SettingsPage {...data} />;
}
