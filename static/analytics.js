/**
 * Client-side analytics tracking script
 * 
 * Tracks page views and provides utilities for tracking user actions.
 * Events are sent to /api/analytics/track endpoint.
 */

(function() {
  'use strict';

  // Prevent multiple initialisations
  if (window.__analyticsInitialised) return;
  window.__analyticsInitialised = true;

  /**
   * Track an analytics event
   * @param {string} eventType - Type of event
   * @param {Object} properties - Event properties
   */
  function trackEvent(eventType, properties) {
    const payload = {
      eventType: eventType,
      properties: properties || {},
      pagePath: window.location.pathname,
      referrer: document.referrer || null
    };

    // Use sendBeacon for reliability (works even when page is unloading)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', JSON.stringify(payload));
    } else {
      // Fallback to fetch
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function() {
        // Silently fail - analytics should never break the user experience
      });
    }
  }

  /**
   * Track page view
   */
  function trackPageView() {
    trackEvent('page_view', {
      title: document.title,
      url: window.location.href
    });
  }

  // Track initial page view
  trackPageView();

  // Track page views on client-side navigation (for SPAs)
  let lastPath = window.location.pathname;
  
  // Use MutationObserver to detect route changes in Fresh/Preact
  const observer = new MutationObserver(function() {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      trackPageView();
    }
  });

  // Start observing after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Also listen for popstate (back/forward navigation)
  window.addEventListener('popstate', function() {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      trackPageView();
    }
  });

  // Expose tracking function globally for use in islands
  window.trackAnalyticsEvent = trackEvent;
})();
