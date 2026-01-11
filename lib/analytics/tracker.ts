/**
 * Analytics tracking module
 *
 * Provides server-side analytics event tracking for page views and user actions.
 * Events are stored in the analytics_events table for later analysis.
 */

import { query } from "../db.ts";

/**
 * Supported analytics event types
 */
export type AnalyticsEventType =
  | "page_view"
  | "search"
  | "add_to_watchlist"
  | "remove_from_watchlist"
  | "add_to_favourites"
  | "remove_from_favourites"
  | "mark_watched"
  | "rate_content"
  | "create_list"
  | "add_to_list"
  | "dismiss_recommendation"
  | "signup"
  | "login"
  | "logout";

/**
 * Analytics event properties (flexible JSONB data)
 */
export interface AnalyticsEventProperties {
  // Search events
  query?: string;
  results_count?: number;

  // Content events
  tmdb_id?: number;
  content_type?: "movie" | "tv";
  content_title?: string;

  // Rating events
  rating?: number;

  // List events
  list_id?: string;
  list_name?: string;

  // Generic properties
  [key: string]: unknown;
}

/**
 * Track an analytics event
 *
 * @param eventType - Type of event to track
 * @param options - Event options including user ID, properties, etc.
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  options: {
    userId?: string;
    properties?: AnalyticsEventProperties;
    pagePath?: string;
    referrer?: string;
    userAgent?: string;
    sessionId?: string;
  } = {},
): Promise<void> {
  try {
    const {
      userId,
      properties = {},
      pagePath,
      referrer,
      userAgent,
      sessionId,
    } = options;

    await query(
      `INSERT INTO analytics_events (
        event_type, user_id, properties, page_path, referrer, user_agent, session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        eventType,
        userId || null,
        JSON.stringify(properties),
        pagePath || null,
        referrer || null,
        userAgent || null,
        sessionId || null,
      ],
    );
  } catch (error) {
    // Log error but don't throw - analytics should never break the main flow
    console.error("Failed to track analytics event:", error);
  }
}

/**
 * Track a page view event
 *
 * @param pagePath - The page path being viewed
 * @param options - Additional options
 */
export async function trackPageView(
  pagePath: string,
  options: {
    userId?: string;
    referrer?: string;
    userAgent?: string;
    sessionId?: string;
  } = {},
): Promise<void> {
  await trackEvent("page_view", {
    ...options,
    pagePath,
  });
}

/**
 * Track a search event
 *
 * @param searchQuery - The search query string
 * @param resultsCount - Number of results returned
 * @param options - Additional options
 */
export async function trackSearch(
  searchQuery: string,
  resultsCount: number,
  options: {
    userId?: string;
    pagePath?: string;
    sessionId?: string;
  } = {},
): Promise<void> {
  await trackEvent("search", {
    ...options,
    properties: {
      query: searchQuery,
      results_count: resultsCount,
    },
  });
}

/**
 * Track a content action (watchlist, favourite, watched, rating)
 *
 * @param action - The action type
 * @param tmdbId - TMDB content ID
 * @param contentType - Movie or TV
 * @param contentTitle - Content title for reference
 * @param options - Additional options
 */
export async function trackContentAction(
  action:
    | "add_to_watchlist"
    | "remove_from_watchlist"
    | "add_to_favourites"
    | "remove_from_favourites"
    | "mark_watched"
    | "rate_content",
  tmdbId: number,
  contentType: "movie" | "tv",
  contentTitle: string,
  options: {
    userId?: string;
    rating?: number;
    sessionId?: string;
  } = {},
): Promise<void> {
  const properties: AnalyticsEventProperties = {
    tmdb_id: tmdbId,
    content_type: contentType,
    content_title: contentTitle,
  };

  if (options.rating !== undefined) {
    properties.rating = options.rating;
  }

  await trackEvent(action, {
    userId: options.userId,
    sessionId: options.sessionId,
    properties,
  });
}

/**
 * Get analytics summary for dashboard
 *
 * @param days - Number of days to look back (default 30)
 */
export async function getAnalyticsSummary(days = 30): Promise<{
  totalPageViews: number;
  uniqueVisitors: number;
  totalSearches: number;
  totalSignups: number;
  topPages: Array<{ page_path: string; count: number }>;
  topSearches: Array<{ query: string; count: number }>;
  eventCounts: Array<{ event_type: string; count: number }>;
  dailyPageViews: Array<{ date: string; count: number }>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Run queries in parallel for efficiency
  const [
    pageViewsResult,
    uniqueVisitorsResult,
    searchesResult,
    signupsResult,
    topPagesResult,
    topSearchesResult,
    eventCountsResult,
    dailyPageViewsResult,
  ] = await Promise.all([
    // Total page views
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM analytics_events 
       WHERE event_type = 'page_view' AND created_at >= $1`,
      [since],
    ),

    // Unique visitors (by session_id)
    query<{ count: string }>(
      `SELECT COUNT(DISTINCT session_id) as count FROM analytics_events 
       WHERE created_at >= $1 AND session_id IS NOT NULL`,
      [since],
    ),

    // Total searches
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM analytics_events 
       WHERE event_type = 'search' AND created_at >= $1`,
      [since],
    ),

    // Total signups
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM analytics_events 
       WHERE event_type = 'signup' AND created_at >= $1`,
      [since],
    ),

    // Top pages
    query<{ page_path: string; count: string }>(
      `SELECT page_path, COUNT(*) as count FROM analytics_events 
       WHERE event_type = 'page_view' AND created_at >= $1 AND page_path IS NOT NULL
       GROUP BY page_path ORDER BY count DESC LIMIT 10`,
      [since],
    ),

    // Top searches
    query<{ query: string; count: string }>(
      `SELECT properties->>'query' as query, COUNT(*) as count FROM analytics_events 
       WHERE event_type = 'search' AND created_at >= $1 AND properties->>'query' IS NOT NULL
       GROUP BY properties->>'query' ORDER BY count DESC LIMIT 10`,
      [since],
    ),

    // Event counts by type
    query<{ event_type: string; count: string }>(
      `SELECT event_type, COUNT(*) as count FROM analytics_events 
       WHERE created_at >= $1
       GROUP BY event_type ORDER BY count DESC`,
      [since],
    ),

    // Daily page views
    query<{ date: string; count: string }>(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM analytics_events 
       WHERE event_type = 'page_view' AND created_at >= $1
       GROUP BY DATE(created_at) ORDER BY date`,
      [since],
    ),
  ]);

  return {
    totalPageViews: parseInt(pageViewsResult[0]?.count || "0", 10),
    uniqueVisitors: parseInt(uniqueVisitorsResult[0]?.count || "0", 10),
    totalSearches: parseInt(searchesResult[0]?.count || "0", 10),
    totalSignups: parseInt(signupsResult[0]?.count || "0", 10),
    topPages: topPagesResult.map((row) => ({
      page_path: row.page_path,
      count: parseInt(row.count, 10),
    })),
    topSearches: topSearchesResult.map((row) => ({
      query: row.query,
      count: parseInt(row.count, 10),
    })),
    eventCounts: eventCountsResult.map((row) => ({
      event_type: row.event_type,
      count: parseInt(row.count, 10),
    })),
    dailyPageViews: dailyPageViewsResult.map((row) => ({
      date: row.date,
      count: parseInt(row.count, 10),
    })),
  };
}
