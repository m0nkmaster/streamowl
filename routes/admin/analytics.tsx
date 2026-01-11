import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../lib/auth/middleware.ts";
import { getAnalyticsSummary } from "../../lib/analytics/tracker.ts";
import { query } from "../../lib/db.ts";

interface AnalyticsData {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSearches: number;
  totalSignups: number;
  topPages: Array<{ page_path: string; count: number }>;
  topSearches: Array<{ query: string; count: number }>;
  eventCounts: Array<{ event_type: string; count: number }>;
  dailyPageViews: Array<{ date: string; count: number }>;
  isAdmin: boolean;
  error?: string;
}

export const handler: Handlers<AnalyticsData> = {
  async GET(req, ctx) {
    try {
      // Require authentication
      const session = await getSessionFromRequest(req);
      if (!session) {
        // Redirect to login
        return new Response(null, {
          status: 302,
          headers: { Location: "/login?redirect=/admin/analytics" },
        });
      }

      // Check if user is admin (for now, check if they are the first user)
      const users = await query<{ id: string }>(
        "SELECT id FROM users ORDER BY created_at ASC LIMIT 1",
      );
      const isAdmin = users.length > 0 && users[0].id === session.userId;

      if (!isAdmin) {
        return ctx.render({
          totalPageViews: 0,
          uniqueVisitors: 0,
          totalSearches: 0,
          totalSignups: 0,
          topPages: [],
          topSearches: [],
          eventCounts: [],
          dailyPageViews: [],
          isAdmin: false,
          error: "Access denied. Admin privileges required.",
        });
      }

      // Get analytics summary for the last 30 days
      const summary = await getAnalyticsSummary(30);

      return ctx.render({
        ...summary,
        isAdmin: true,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      return ctx.render({
        totalPageViews: 0,
        uniqueVisitors: 0,
        totalSearches: 0,
        totalSignups: 0,
        topPages: [],
        topSearches: [],
        eventCounts: [],
        dailyPageViews: [],
        isAdmin: false,
        error: "Failed to load analytics data",
      });
    }
  },
};

export default function AnalyticsDashboard({ data }: PageProps<AnalyticsData>) {
  if (data.error) {
    return (
      <div class="max-w-7xl mx-auto px-4 py-8">
        <div
          class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded"
          role="alert"
        >
          <p>{data.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Analytics Dashboard
      </h1>

      {/* Key Metrics */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Page Views"
          value={data.totalPageViews.toLocaleString()}
          description="Last 30 days"
        />
        <MetricCard
          title="Unique Visitors"
          value={data.uniqueVisitors.toLocaleString()}
          description="Last 30 days"
        />
        <MetricCard
          title="Searches"
          value={data.totalSearches.toLocaleString()}
          description="Last 30 days"
        />
        <MetricCard
          title="Sign Ups"
          value={data.totalSignups.toLocaleString()}
          description="Last 30 days"
        />
      </div>

      {/* Charts and Tables */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Pages */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Top Pages
          </h2>
          {data.topPages.length > 0
            ? (
              <table class="w-full">
                <thead>
                  <tr class="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th class="pb-2">Page</th>
                    <th class="pb-2 text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.map((page) => (
                    <tr
                      key={page.page_path}
                      class="border-b border-gray-100 dark:border-gray-700"
                    >
                      <td class="py-2 text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {page.page_path}
                      </td>
                      <td class="py-2 text-right text-gray-600 dark:text-gray-400">
                        {page.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
            : (
              <p class="text-gray-500 dark:text-gray-400">No page view data yet</p>
            )}
        </div>

        {/* Top Searches */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Top Searches
          </h2>
          {data.topSearches.length > 0
            ? (
              <table class="w-full">
                <thead>
                  <tr class="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th class="pb-2">Search Query</th>
                    <th class="pb-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSearches.map((search) => (
                    <tr
                      key={search.query}
                      class="border-b border-gray-100 dark:border-gray-700"
                    >
                      <td class="py-2 text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {search.query}
                      </td>
                      <td class="py-2 text-right text-gray-600 dark:text-gray-400">
                        {search.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
            : (
              <p class="text-gray-500 dark:text-gray-400">No search data yet</p>
            )}
        </div>

        {/* Event Breakdown */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Event Breakdown
          </h2>
          {data.eventCounts.length > 0
            ? (
              <table class="w-full">
                <thead>
                  <tr class="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th class="pb-2">Event Type</th>
                    <th class="pb-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.eventCounts.map((event) => (
                    <tr
                      key={event.event_type}
                      class="border-b border-gray-100 dark:border-gray-700"
                    >
                      <td class="py-2 text-gray-900 dark:text-gray-100">
                        {formatEventType(event.event_type)}
                      </td>
                      <td class="py-2 text-right text-gray-600 dark:text-gray-400">
                        {event.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
            : (
              <p class="text-gray-500 dark:text-gray-400">No event data yet</p>
            )}
        </div>

        {/* Daily Page Views */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Daily Page Views
          </h2>
          {data.dailyPageViews.length > 0
            ? (
              <div class="space-y-2">
                {data.dailyPageViews.slice(-14).map((day) => {
                  const maxCount = Math.max(
                    ...data.dailyPageViews.map((d) => d.count),
                  );
                  const percentage = maxCount > 0
                    ? (day.count / maxCount) * 100
                    : 0;
                  return (
                    <div key={day.date} class="flex items-center gap-3">
                      <span class="text-sm text-gray-600 dark:text-gray-400 w-24">
                        {formatDate(day.date)}
                      </span>
                      <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          class="bg-green-500 h-4 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                        {day.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
            : (
              <p class="text-gray-500 dark:text-gray-400">
                No daily data yet
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

function MetricCard(
  { title, value, description }: {
    title: string;
    value: string;
    description: string;
  },
) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">
        {value}
      </p>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {description}
      </p>
    </div>
  );
}

function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
