// Service Worker for Stream Owl PWA
// Version 1.0.0

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
