/**
 * Client-side analytics tracking module
 *
 * Provides functions for tracking page views and user actions
 * from the browser. Uses the /api/analytics/track endpoint.
 */

/**
 * Event types for analytics tracking (client-side)
 */
export type ClientEventType =
  | "page_view"
  | "search"
  | "add_to_list"
  | "rate_content"
  | "add_to_watchlist"
  | "add_to_favourites"
  | "mark_as_watched"
  | "create_list"
  | "click"
  | "recommendation_view"
  | "recommendation_dismiss";

/**
 * Get or create a session ID for tracking
 */
function getSessionId(): string {
  if (typeof globalThis.sessionStorage === "undefined") {
    return "server-side";
  }

  let sessionId = globalThis.sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    globalThis.sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Track an analytics event
 */
export function trackEvent(
  eventType: ClientEventType,
  eventName: string,
  metadata?: Record<string, unknown>,
): void {
  // Skip tracking if not in browser
  if (typeof globalThis.fetch === "undefined") {
    return;
  }

  try {
    const payload = {
      eventType,
      eventName,
      pagePath: typeof globalThis.location !== "undefined"
        ? globalThis.location.pathname
        : undefined,
      referrer: typeof globalThis.document !== "undefined"
        ? globalThis.document.referrer || undefined
        : undefined,
      sessionId: getSessionId(),
      metadata,
    };

    // Use sendBeacon for page unload events, fetch otherwise
    const endpoint = "/api/analytics/track";
    const body = JSON.stringify(payload);

    // Non-blocking request
    void fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      // Use keepalive to ensure request completes even during page unload
      keepalive: true,
    }).catch(() => {
      // Silently fail - analytics should not break the app
    });
  } catch {
    // Silently fail
  }
}

/**
 * Track a page view
 */
export function trackPageView(pagePath?: string): void {
  const path = pagePath ||
    (typeof globalThis.location !== "undefined"
      ? globalThis.location.pathname
      : "/");
  void trackEvent("page_view", path);
}

/**
 * Track a search action
 */
export function trackSearch(query: string, resultsCount: number): void {
  void trackEvent("search", "search_performed", {
    query,
    results_count: resultsCount,
  });
}

/**
 * Track adding content to a list
 */
export function trackAddToList(
  tmdbId: number,
  listName: string,
  contentTitle?: string,
): void {
  void trackEvent("add_to_list", "add_to_list", {
    tmdb_id: tmdbId,
    list_name: listName,
    content_title: contentTitle,
  });
}

/**
 * Track rating content
 */
export function trackRateContent(
  tmdbId: number,
  rating: number,
  contentTitle?: string,
): void {
  void trackEvent("rate_content", "rate_content", {
    tmdb_id: tmdbId,
    rating,
    content_title: contentTitle,
  });
}

/**
 * Track adding content to watchlist
 */
export function trackAddToWatchlist(
  tmdbId: number,
  contentTitle?: string,
): void {
  void trackEvent("add_to_watchlist", "add_to_watchlist", {
    tmdb_id: tmdbId,
    content_title: contentTitle,
  });
}

/**
 * Track adding content to favourites
 */
export function trackAddToFavourites(
  tmdbId: number,
  contentTitle?: string,
): void {
  void trackEvent("add_to_favourites", "add_to_favourites", {
    tmdb_id: tmdbId,
    content_title: contentTitle,
  });
}

/**
 * Track marking content as watched
 */
export function trackMarkAsWatched(
  tmdbId: number,
  contentTitle?: string,
): void {
  void trackEvent("mark_as_watched", "mark_as_watched", {
    tmdb_id: tmdbId,
    content_title: contentTitle,
  });
}

/**
 * Track creating a custom list
 */
export function trackCreateList(listName: string): void {
  void trackEvent("create_list", "create_list", {
    list_name: listName,
  });
}

/**
 * Track a click event
 */
export function trackClick(
  elementId: string,
  elementType: string,
  metadata?: Record<string, unknown>,
): void {
  void trackEvent("click", elementId, {
    element_type: elementType,
    ...metadata,
  });
}
