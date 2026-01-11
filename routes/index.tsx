import { Head } from "$fresh/runtime.ts";
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
    const baseUrl = Deno.env.get("APP_BASE_URL") || new URL(req.url).origin;
    return ctx.render({ isAuthenticated: session !== null, baseUrl });
  },
};

interface HomePageProps {
  isAuthenticated: boolean;
  baseUrl: string;
}

export default function Home({ data }: { data: HomePageProps }) {
  const { isAuthenticated, baseUrl } = data;

  const ogImageUrl = `${baseUrl}/logo.svg`;

  if (isAuthenticated) {
    // Show personalised home feed for authenticated users
    return (
      <>
        <Head>
          <title>Stream Owl - Wise recommendations, one stream at a time</title>
          <meta property="og:title" content="Stream Owl - Wise recommendations, one stream at a time" />
          <meta property="og:description" content="Discover where movies, TV shows, and documentaries are available across streaming services with AI-powered recommendations." />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={baseUrl} />
          <meta property="og:site_name" content="Stream Owl" />
          <meta property="og:image" content={ogImageUrl} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content="Stream Owl - Wise recommendations, one stream at a time" />
          <meta name="twitter:description" content="Discover where movies, TV shows, and documentaries are available across streaming services with AI-powered recommendations." />
          <meta name="twitter:image" content={ogImageUrl} />
          <link rel="canonical" href={baseUrl} />
        </Head>
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
      </>
    );
  }

  // Show welcome page for guests
  return (
    <>
      <Head>
        <title>Stream Owl - Wise recommendations, one stream at a time</title>
        <meta property="og:title" content="Stream Owl - Wise recommendations, one stream at a time" />
        <meta property="og:description" content="Discover where movies, TV shows, and documentaries are available across streaming services with AI-powered recommendations." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={baseUrl} />
        <meta property="og:site_name" content="Stream Owl" />
        <meta property="og:image" content={ogImageUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Stream Owl - Wise recommendations, one stream at a time" />
        <meta name="twitter:description" content="Discover where movies, TV shows, and documentaries are available across streaming services with AI-powered recommendations." />
        <meta name="twitter:image" content={ogImageUrl} />
        <link rel="canonical" href={baseUrl} />
      </Head>
      <div class="px-4 py-8 mx-auto bg-[#86efac]">
        <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
          <img
            class="my-6"
            src="/logo.svg"
            width="128"
            height="128"
            alt="Stream Owl logo"
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
    </>
  );
}
