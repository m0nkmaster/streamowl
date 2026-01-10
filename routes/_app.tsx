import { type PageProps } from "$fresh/server.ts";
import Navigation from "../islands/Navigation.tsx";
import Footer from "../components/Footer.tsx";
import NotificationPrompt from "../islands/NotificationPrompt.tsx";

export default function App({ Component, url, data }: PageProps) {
  // Get currentPath from Fresh's url prop (always available)
  // Get isAuthenticated from route data if provided, default to false
  const currentPath = url.pathname;
  const isAuthenticated = data?.isAuthenticated ?? false;

  return (
    <html class="h-full">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Stream Owl</title>
        {/* Preconnect to critical third-party origins for faster resource loading */}
        <link
          rel="preconnect"
          href="https://image.tmdb.org"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        {/* Preconnect for YouTube embeds (trailers) */}
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        {/* Preload critical CSS to avoid render-blocking */}
        <link rel="preload" href="/styles.css" as="style" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#86efac" />
        <meta
          name="description"
          content="Wise recommendations, one stream at a time. Discover where movies, TV shows, and documentaries are available across streaming services."
        />
        {/* Preconnect to external domains for faster resource loading */}
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://www.themoviedb.org" />
        <link rel="dns-prefetch" href="https://www.themoviedb.org" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://esm.sh" />
        <link rel="dns-prefetch" href="https://esm.sh" />
        <link rel="stylesheet" href="/styles.css" />
        <script src="/analytics.js" defer></script>
        <style>
          {`
          @keyframes slide-in {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
          
          /* Global focus styles for keyboard navigation */
          *:focus-visible {
            outline: 2px solid #6366f1;
            outline-offset: 2px;
          }
          
          /* Ensure buttons and links are keyboard accessible */
          button:not([disabled]):focus-visible,
          a:focus-visible,
          input:not([disabled]):focus-visible,
          textarea:not([disabled]):focus-visible,
          select:not([disabled]):focus-visible {
            outline: 2px solid #6366f1;
            outline-offset: 2px;
          }
        `}
        </style>
      </head>
      <body class="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Navigation
          currentPath={currentPath}
          isAuthenticated={isAuthenticated}
        />
        <main class="flex-1" role="main">
          <Component />
        </main>
        <Footer />
        <NotificationPrompt isAuthenticated={isAuthenticated} />
        {/* deno-lint-ignore react-no-danger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Theme detection and application
              (function() {
                function getThemePreference() {
                  const stored = localStorage.getItem('theme');
                  if (stored) {
                    return stored;
                  }
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                
                function applyTheme(theme) {
                  const root = document.documentElement;
                  if (theme === 'dark') {
                    root.classList.add('dark');
                  } else {
                    root.classList.remove('dark');
                  }
                }
                
                // Apply theme immediately to prevent flash
                const theme = getThemePreference();
                applyTheme(theme);
                
                // Listen for system theme changes
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                  const stored = localStorage.getItem('theme');
                  if (!stored) {
                    applyTheme(e.matches ? 'dark' : 'light');
                  }
                });
              })();
              
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('Service Worker registered:', registration.scope);
                    })
                    .catch((error) => {
                      console.error('Service Worker registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
