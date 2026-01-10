import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";
import Navigation from "../islands/Navigation.tsx";

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
      </head>
      <body>
        <Navigation
          currentPath={currentPath}
          isAuthenticated={isAuthenticated}
        />
        <Component />
      </body>
    </html>
  );
}
