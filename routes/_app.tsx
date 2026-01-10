import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";
import Navigation from "../islands/Navigation.tsx";
import Footer from "../components/Footer.tsx";

interface AppProps {
  currentPath: string;
  isAuthenticated: boolean;
}

export const handler: Handlers<AppProps> = {
  async GET(req, ctx) {
    const session = await getSessionFromRequest(req);
    const url = new URL(req.url);
    return ctx.render({
      currentPath: url.pathname,
      isAuthenticated: session !== null,
    });
  },
};

export default function App({ Component, data }: PageProps<AppProps>) {
  const { currentPath, isAuthenticated } = data;

  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Stream Owl</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#86efac" />
        <meta
          name="description"
          content="Wise recommendations, one stream at a time. Discover where movies, TV shows, and documentaries are available across streaming services."
        />
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
        `}
        </style>
      </head>
      <body class="flex flex-col min-h-screen">
        <Navigation
          currentPath={currentPath}
          isAuthenticated={isAuthenticated}
        />
        <main class="flex-1">
          <Component />
        </main>
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
