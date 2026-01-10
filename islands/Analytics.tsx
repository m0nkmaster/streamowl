/**
 * Analytics island component
 *
 * Automatically tracks page views when mounted.
 * Should be included in the _app.tsx layout.
 */

import { useEffect } from "preact/hooks";
import { trackPageView } from "../lib/analytics/client.ts";

interface AnalyticsProps {
  /** Current page path */
  pagePath: string;
}

/**
 * Analytics component that tracks page views
 *
 * This is a minimal island component that fires a page view
 * event when mounted. It renders nothing to the DOM.
 */
export default function Analytics({ pagePath }: AnalyticsProps) {
  useEffect(() => {
    // Track page view on mount
    trackPageView(pagePath);
  }, [pagePath]);

  // Render nothing - this is just for tracking
  return null;
}
