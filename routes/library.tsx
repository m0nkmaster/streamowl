import { type Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";
import LibraryTabs from "../islands/LibraryTabs.tsx";

/**
 * Protected library route - requires authentication
 * Redirects unauthenticated users to login with return URL
 */
export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSessionFromRequest(req);

    if (!session) {
      // Redirect to login with return URL
      const url = new URL(req.url);
      const returnTo = encodeURIComponent(url.pathname + url.search);
      const loginUrl = `/login?returnTo=${returnTo}`;

      return new Response(null, {
        status: 302,
        headers: {
          Location: loginUrl,
        },
      });
    }

    // User is authenticated, render the page
    return ctx.render();
  },
};

export default function LibraryPage() {
  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Library</h1>
        <LibraryTabs initialTab="watched" />
      </div>
    </div>
  );
}
