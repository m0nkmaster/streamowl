import { type Handlers, type PageProps } from "$fresh/server.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";
import {
  CSRF_FIELD_NAME,
  generateCsrfToken,
  setCsrfCookie,
} from "../lib/security/csrf.ts";

interface DashboardPageProps {
  csrfToken: string;
}

/**
 * Protected dashboard route - requires authentication
 * Redirects unauthenticated users to login with return URL
 */
export const handler: Handlers<DashboardPageProps> = {
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

    // Generate CSRF token and set cookie
    const csrfToken = generateCsrfToken();
    const headers = new Headers();
    setCsrfCookie(headers, csrfToken);

    // User is authenticated, render the page
    return ctx.render({ csrfToken }, { headers });
  },
};

export default function DashboardPage(props: PageProps<DashboardPageProps>) {
  const { csrfToken } = props.data;

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p class="mt-2 text-gray-600">
              Welcome to your Stream Owl dashboard!
            </p>
          </div>
          <form method="POST" action="/api/logout">
            <input type="hidden" name={CSRF_FIELD_NAME} value={csrfToken} />
            <button
              type="submit"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
