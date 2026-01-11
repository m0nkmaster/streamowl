/**
 * Footer component with TMDB attribution and legal links
 * Required by TMDB API terms of service
 */
export default function Footer() {
  return (
    <footer
      class="bg-gray-800 dark:bg-gray-950 text-gray-200 dark:text-gray-300 mt-auto"
      role="contentinfo"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col gap-6">
          {/* TMDB Attribution */}
          <div class="flex flex-col sm:flex-row items-center gap-3">
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 hover:text-white dark:hover:text-gray-100 transition-colors"
              aria-label="Visit The Movie Database"
            >
              <img
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                alt="TMDB Logo"
                class="h-6"
                width="76"
                height="24"
                loading="lazy"
              />
            </a>
            <p class="text-sm text-center sm:text-left">
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </p>
          </div>

          {/* Legal Links and Copyright */}
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-700 dark:border-gray-800">
            <nav aria-label="Legal links" class="flex items-center gap-6">
              <a
                href="/privacy"
                class="text-sm text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-200 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                class="text-sm text-gray-300 dark:text-gray-400 hover:text-white dark:hover:text-gray-200 transition-colors"
              >
                Terms of Service
              </a>
            </nav>
            <p class="text-sm text-gray-300 dark:text-gray-400">
              &copy; {new Date().getFullYear()} Stream Owl
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
