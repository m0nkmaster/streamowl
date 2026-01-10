import { type Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../lib/auth/middleware.ts";
import RecommendationFeed from "../islands/RecommendationFeed.tsx";
import ContinueWatching from "../islands/ContinueWatching.tsx";
import NewReleases from "../islands/NewReleases.tsx";

/**
 * Home page handler
 * Shows recommendations for authenticated users, welcome page for guests
 */
export const handler: Handlers = {
  async GET(req, ctx) {
    const session = await getSessionFromRequest(req);
    return ctx.render({ isAuthenticated: session !== null });
  },
};

interface HomePageProps {
  isAuthenticated: boolean;
}

export default function Home({ data }: { data: HomePageProps }) {
  const { isAuthenticated } = data;

  if (isAuthenticated) {
    // Show personalised home feed for authenticated users
    return (
      <div class="min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Recommendations section - prominently displayed */}
          <RecommendationFeed />

          {/* Continue Watching section - shows recent activity */}
          <ContinueWatching />

          {/* New Releases section - shows fresh content */}
          <NewReleases />
        </div>
      </div>
    );
  }

  // Show welcome page for guests
  return (
    <div class="px-4 py-8 mx-auto bg-[#86efac]">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <img
          class="my-6"
          src="/logo.svg"
          width="128"
          height="128"
          alt="the Fresh logo: a sliced lemon dripping with juice"
        />
        <h1 class="text-4xl font-bold">Welcome to Stream Owl</h1>
        <p class="my-4">
          Discover your next favourite movie or TV show with AI-powered
          recommendations.
        </p>
        <div class="mt-6">
          <a
            href="/login"
            class="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}
