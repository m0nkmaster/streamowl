import { type PageProps } from "$fresh/server.ts";
import SearchPage from "../islands/SearchPage.tsx";

/**
 * Search page route
 * Displays search input and results for movies and TV shows
 */
export default function Search(_props: PageProps) {
  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Search</h1>
        <SearchPage />
      </div>
    </div>
  );
}
