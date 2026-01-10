/**
 * Analytics Dashboard island component
 *
 * Displays key metrics and charts for analytics data.
 */

import { useEffect, useState } from "preact/hooks";

interface AnalyticsSummary {
  totalPageViews: number;
  totalSearches: number;
  totalActions: number;
  uniqueUsers: number;
  topPages: Array<{ page: string; views: number }>;
  topSearches: Array<{ query: string; count: number }>;
  eventsByType: Array<{ eventType: string; count: number }>;
  dailyStats: Array<{ date: string; pageViews: number; actions: number }>;
}

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/analytics/summary?days=${days}`);
        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }
        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [days]);

  if (loading) {
    return (
      <div class="animate-pulse space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              class="bg-gray-200 dark:bg-gray-700 h-24 rounded-lg"
            />
          ))}
        </div>
        <div class="bg-gray-200 dark:bg-gray-700 h-64 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div class="text-center py-8">
        <p class="text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => setDays(days)}
          class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Format event type for display
  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div class="space-y-6">
      {/* Time Range Selector */}
      <div class="flex justify-end">
        <select
          value={days}
          onChange={(e) =>
            setDays(parseInt((e.target as HTMLSelectElement).value, 10))}
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Page Views"
          value={summary.totalPageViews}
          icon="📊"
        />
        <MetricCard
          title="Searches"
          value={summary.totalSearches}
          icon="🔍"
        />
        <MetricCard
          title="User Actions"
          value={summary.totalActions}
          icon="⚡"
        />
        <MetricCard
          title="Unique Users"
          value={summary.uniqueUsers}
          icon="👥"
        />
      </div>

      {/* Charts and Tables */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Stats Chart */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Daily Activity
          </h3>
          <div class="space-y-2">
            {summary.dailyStats.slice(0, 7).map((stat) => (
              <div key={stat.date} class="flex items-center gap-2">
                <span class="w-24 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(stat.date).toLocaleDateString("en-GB", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div class="flex-1 flex items-center gap-2">
                  <div
                    class="bg-indigo-500 h-4 rounded"
                    style={{
                      width: `${
                        Math.min(
                          100,
                          (stat.pageViews /
                            Math.max(
                              ...summary.dailyStats.map((s) => s.pageViews),
                              1,
                            )) * 100,
                        )
                      }%`,
                    }}
                    title={`${stat.pageViews} page views`}
                  />
                  <span class="text-xs text-gray-500">{stat.pageViews}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events by Type */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Events by Type
          </h3>
          <div class="space-y-2">
            {summary.eventsByType.map((event) => (
              <div
                key={event.eventType}
                class="flex items-center justify-between"
              >
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {formatEventType(event.eventType)}
                </span>
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {event.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Top Pages
          </h3>
          <div class="space-y-2">
            {summary.topPages.length === 0
              ? (
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  No page view data yet
                </p>
              )
              : (
                summary.topPages.map((page, index) => (
                  <div
                    key={page.page}
                    class="flex items-center justify-between"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-gray-500">{index + 1}.</span>
                      <span class="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                        {page.page}
                      </span>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {page.views.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
          </div>
        </div>

        {/* Top Searches */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Top Searches
          </h3>
          <div class="space-y-2">
            {summary.topSearches.length === 0
              ? (
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  No search data yet
                </p>
              )
              : (
                summary.topSearches.map((search, index) => (
                  <div
                    key={search.query}
                    class="flex items-center justify-between"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-gray-500">{index + 1}.</span>
                      <span class="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                        "{search.query}"
                      </span>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {search.count.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric card component
 */
function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {value.toLocaleString()}
          </p>
        </div>
        <span class="text-3xl" role="img" aria-hidden="true">
          {icon}
        </span>
      </div>
    </div>
  );
}
