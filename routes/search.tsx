import { type PageProps } from "$fresh/server.ts";
import SearchPage from "../islands/SearchPage.tsx";
import SEO from "../components/SEO.tsx";

/**
 * Search page route
 * Displays search input and results for movies and TV shows
 */
export default function Search(_props: PageProps) {
  return (
    <>
      <SEO
        title="Search"
        description="Search for movies, TV shows, and documentaries. Find where to stream your favourite content across Netflix, Disney+, Amazon Prime, and more."
        url="/search"
      />
      <div class="min-h-screen bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-8">Search</h1>
          <SearchPage />
        </div>
      </div>
    </>
  );
}
