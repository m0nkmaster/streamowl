// Service Worker for Stream Owl PWA
// Version 1.1.0 - Added push notification support

const CACHE_NAME = "stream-owl-v1";
const STATIC_CACHE_NAME = "stream-owl-static-v1";
const LIBRARY_CACHE_NAME = "stream-owl-library-v1";

// Static assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.svg",
];

// Library API endpoints to cache
const LIBRARY_ENDPOINTS = [
  "/api/library/watched",
  "/api/library/watchlist",
  "/api/library/favourites",
  "/api/library/lists",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  // Activate immediately to replace old service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== STATIC_CACHE_NAME &&
              name !== LIBRARY_CACHE_NAME &&
              name !== CACHE_NAME;
          })
          .map((name) => caches.delete(name)),
      );
    }),
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Cache-first strategy for static assets
  if (
    url.pathname.startsWith("/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/logo.svg"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      }),
    );
    return;
  }

  // Network-first with cache fallback for library API endpoints
  if (LIBRARY_ENDPOINTS.some((endpoint) => url.pathname.startsWith(endpoint))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(LIBRARY_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline response if no cache
            return new Response(
              JSON.stringify({ error: "Offline - no cached data available" }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            );
          });
        }),
    );
    return;
  }

  // Network-first for other requests (HTML pages, other API calls)
  event.respondWith(
    fetch(request).catch(() => {
      // If network fails and it's a navigation request, return cached index
      if (request.mode === "navigate") {
        return caches.match("/");
      }
      return new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      });
    }),
  );
});

// Push notification event - handles incoming push messages
self.addEventListener("push", (event) => {
  // Default notification data
  let notificationData = {
    title: "Stream Owl",
    body: "You have a new notification",
    icon: "/logo.svg",
    badge: "/logo.svg",
    tag: "stream-owl-notification",
    data: {
      url: "/",
    },
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        title: pushData.title || notificationData.title,
        body: pushData.body || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        badge: pushData.badge || notificationData.badge,
        tag: pushData.tag || notificationData.tag,
        data: {
          url: pushData.url || pushData.data?.url || "/",
          contentId: pushData.contentId || pushData.data?.contentId,
          type: pushData.type || pushData.data?.type,
        },
      };
    } catch (e) {
      // If JSON parsing fails, try as text
      console.error("Failed to parse push data:", e);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Show the notification
  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      // Notification options for better UX
      vibrate: [100, 50, 100],
      requireInteraction: false,
      actions: [
        {
          action: "view",
          title: "View",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
    },
  );

  event.waitUntil(promiseChain);
});

// Notification click event - handles user clicking on notification
self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Handle dismiss action
  if (action === "dismiss") {
    return;
  }

  // Determine the URL to open
  let targetUrl = "/";
  
  if (data.url) {
    targetUrl = data.url;
  } else if (data.contentId) {
    targetUrl = `/content/${data.contentId}`;
  }

  // Ensure absolute URL
  if (!targetUrl.startsWith("http")) {
    targetUrl = new URL(targetUrl, self.location.origin).href;
  }

  // Open or focus the appropriate window
  const promiseChain = self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  }).then((windowClients) => {
    // Check if there's already a window open with the target URL
    for (const client of windowClients) {
      if (client.url === targetUrl && "focus" in client) {
        return client.focus();
      }
    }
    
    // Check if any window is open for our origin
    for (const client of windowClients) {
      if (client.url.startsWith(self.location.origin) && "navigate" in client) {
        return client.navigate(targetUrl).then((client) => client.focus());
      }
    }
    
    // Open new window if needed
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  });

  event.waitUntil(promiseChain);
});

// Push subscription change event - handles subscription expiration
self.addEventListener("pushsubscriptionchange", (event) => {
  // Re-subscribe when subscription changes
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY,
    }).then((subscription) => {
      // Send new subscription to server
      return fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          resubscribe: true,
        }),
      });
    }),
  );
});
