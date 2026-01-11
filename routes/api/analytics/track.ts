import { type Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../../lib/auth/middleware.ts";
import { trackEvent, type AnalyticsEventType } from "../../../lib/analytics/tracker.ts";

/**
 * Extract a cookie value from request
 */
function getCookieValue(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.get("Cookie");
  if (!cookieHeader) return undefined;
  
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));
  
  if (!cookie) return undefined;
  return cookie.substring(name.length + 1);
}

/**
 * API endpoint for tracking analytics events
 *
 * POST /api/analytics/track
 * - Tracks page views and user actions
 * - Creates session ID cookie if not present
 * - Associates events with user if authenticated
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      // Parse request body
      const body = await req.json();
      const { eventType, properties, pagePath, referrer } = body;

      // Validate event type
      const validEventTypes: AnalyticsEventType[] = [
        "page_view",
        "search",
        "add_to_watchlist",
        "remove_from_watchlist",
        "add_to_favourites",
        "remove_from_favourites",
        "mark_watched",
        "rate_content",
        "create_list",
        "add_to_list",
        "dismiss_recommendation",
        "signup",
        "login",
        "logout",
      ];

      if (!eventType || !validEventTypes.includes(eventType)) {
        return new Response(
          JSON.stringify({ error: "Invalid event type" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get or create session ID
      let sessionId = getCookieValue(req, "analytics_session");
      const headers = new Headers({ "Content-Type": "application/json" });

      if (!sessionId) {
        sessionId = crypto.randomUUID();
        // Set session cookie (expires in 30 minutes of inactivity)
        const isProduction = Deno.env.get("DENO_ENV") === "production";
        let cookieValue = `analytics_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800`;
        if (isProduction) {
          cookieValue += "; Secure";
        }
        headers.set("Set-Cookie", cookieValue);
      }

      // Get user ID if authenticated
      let userId: string | undefined;
      try {
        const session = await getSessionFromRequest(req);
        if (session) {
          userId = session.userId;
        }
      } catch {
        // Not authenticated - that's fine, track as anonymous
      }

      // Get user agent from request
      const userAgent = req.headers.get("user-agent") || undefined;

      // Track the event
      await trackEvent(eventType, {
        userId,
        properties: properties || {},
        pagePath,
        referrer,
        userAgent,
        sessionId,
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers,
        },
      );
    } catch (error) {
      console.error("Error tracking analytics event:", error);
      return new Response(
        JSON.stringify({ error: "Failed to track event" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
