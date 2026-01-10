/**
 * Analytics Dashboard Page
 *
 * Displays key metrics and analytics data for authenticated users.
 */

import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionToken } from "../lib/auth/cookies.ts";
import { verifySessionToken } from "../lib/auth/jwt.ts";
import AnalyticsDashboard from "../islands/AnalyticsDashboard.tsx";

interface AnalyticsPageData {
  isAuthenticated: boolean;
}

export const handler: Handlers<AnalyticsPageData> = {
  async GET(req, ctx) {
    // Check authentication
    const token = getSessionToken(req);
    if (!token) {
      // Redirect to login
      const url = new URL(req.url);
      return Response.redirect(
        new URL(`/login?redirect=${encodeURIComponent(url.pathname)}`, url),
        302,
      );
    }

    try {
      await verifySessionToken(token);
      return ctx.render({ isAuthenticated: true });
    } catch {
      // Invalid token, redirect to login
      const url = new URL(req.url);
      return Response.redirect(
        new URL(`/login?redirect=${encodeURIComponent(url.pathname)}`, url),
        302,
      );
    }
  },
};

export default function AnalyticsPage(_props: PageProps<AnalyticsPageData>) {
  return (
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Analytics Dashboard
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Track page views, searches, and user actions
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
