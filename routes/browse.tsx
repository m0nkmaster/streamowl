import { type PageProps } from "$fresh/server.ts";
import BrowsePage from "../islands/BrowsePage.tsx";

/**
 * Browse page route
 * Displays trending content and other browse sections
 */
export default function Browse(_props: PageProps) {
  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">Browse</h1>
        <BrowsePage />
      </div>
    </div>
  );
}
