import { Head } from "$fresh/runtime.ts";

/**
 * Custom 404 page with helpful navigation options
 * Provides links to home, browse, and search functionality
 */
export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page Not Found - Stream Owl</title>
        <meta
          name="description"
          content="The page you're looking for doesn't exist. Find your next favourite movie or TV show."
        />
      </Head>
      <div class="min-h-[60vh] bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4 py-12">
        <div class="max-w-md mx-auto text-center">
          {/* Owl emoji as visual indicator */}
          <div
            class="text-8xl mb-6"
            role="img"
            aria-label="Confused owl"
          >
            🦉
          </div>

          {/* 404 heading */}
          <h1 class="text-6xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            404
          </h1>
          <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Page Not Found
          </h2>

          {/* Friendly message */}
          <p class="text-gray-600 dark:text-gray-400 mb-8">
            Hoot! The page you're looking for doesn't exist. It may have been
            moved, or perhaps the URL is incorrect.
          </p>

          {/* Search form */}
          <div class="mb-8">
            <form
              action="/search"
              method="GET"
              class="flex flex-col sm:flex-row gap-2"
            >
              <label for="search-query" class="sr-only">
                Search for movies and TV shows
              </label>
              <input
                type="text"
                id="search-query"
                name="q"
                placeholder="Search for movies and TV shows..."
                class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px]"
                aria-describedby="search-help"
              />
              <button
                type="submit"
                class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors font-medium min-h-[44px] min-w-[44px]"
              >
                Search
              </button>
            </form>
            <p
              id="search-help"
              class="text-sm text-gray-500 dark:text-gray-400 mt-2"
            >
              Try searching for your favourite movie or TV show
            </p>
          </div>

          {/* Navigation options */}
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/"
              class="inline-flex items-center justify-center px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium min-h-[44px]"
            >
              <span class="mr-2" aria-hidden="true">🏠</span>
              Go Home
            </a>
            <a
              href="/browse"
              class="inline-flex items-center justify-center px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium min-h-[44px]"
            >
              <span class="mr-2" aria-hidden="true">🔍</span>
              Browse Content
            </a>
          </div>

          {/* Popular suggestions */}
          <div class="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Popular searches:
            </p>
            <div class="flex flex-wrap gap-2 justify-center">
              {["Inception", "Breaking Bad", "The Office", "Stranger Things"]
                .map(
                  (term) => (
                    <a
                      key={term}
                      href={`/search?q=${encodeURIComponent(term)}`}
                      class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                      {term}
                    </a>
                  ),
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
