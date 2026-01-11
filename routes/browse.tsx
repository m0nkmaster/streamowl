import { Head } from "$fresh/runtime.ts";
import { type PageProps } from "$fresh/server.ts";
import BrowsePage from "../islands/BrowsePage.tsx";

/**
 * Browse page route
 * Displays trending content and other browse sections
 */
export default function Browse(_props: PageProps) {
  return (
    <>
      <Head>
        <title>Browse Movies & TV Shows - Stream Owl</title>
        <meta
          name="description"
          content="Browse trending movies, TV shows, new releases, and content leaving streaming services soon. Find what to watch next."
        />
        <meta property="og:title" content="Browse Movies & TV Shows - Stream Owl" />
        <meta property="og:description" content="Browse trending movies, TV shows, new releases, and content leaving streaming services soon. Find what to watch next." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Stream Owl" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Browse Movies & TV Shows - Stream Owl" />
        <meta name="twitter:description" content="Browse trending movies, TV shows, new releases, and content leaving streaming services soon. Find what to watch next." />
      </Head>
      <div class="min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-8">Browse</h1>
          <BrowsePage />
        </div>
      </div>
    </>
  );
}
