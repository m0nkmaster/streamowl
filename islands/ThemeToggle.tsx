import { useEffect, useState } from "preact/hooks";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get current theme preference
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    } else {
      setTheme("system");
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;

    if (newTheme === "system") {
      localStorage.removeItem("theme");
      const systemPrefersDark = globalThis.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      if (systemPrefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    } else {
      localStorage.setItem("theme", newTheme);
      if (newTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  if (!mounted) {
    // Prevent hydration mismatch by not rendering until mounted
    return null;
  }

  const currentDisplayTheme = theme === "system"
    ? (globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light")
    : theme;

  return (
    <div class="mb-6">
      <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Theme Preference
      </h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Choose your preferred colour scheme. Select "System" to follow your
        device settings.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleThemeChange("light")}
          class={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
            theme === "light"
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <div>
              <div class="font-medium">Light</div>
              <div class="text-xs opacity-70">Always light</div>
            </div>
          </div>
          {theme === "light" && (
            <div class="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
              ✓ Current selection
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleThemeChange("dark")}
          class={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
            theme === "dark"
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            <div>
              <div class="font-medium">Dark</div>
              <div class="text-xs opacity-70">Always dark</div>
            </div>
          </div>
          {theme === "dark" && (
            <div class="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
              ✓ Current selection
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleThemeChange("system")}
          class={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
            theme === "system"
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div class="flex items-center gap-2">
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <div>
              <div class="font-medium">System</div>
              <div class="text-xs opacity-70">
                {currentDisplayTheme === "dark" ? "Dark" : "Light"} (system)
              </div>
            </div>
          </div>
          {theme === "system" && (
            <div class="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
              ✓ Current selection
            </div>
          )}
        </button>
      </div>

      {theme === "system" && (
        <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            Currently using {currentDisplayTheme === "dark" ? "dark" : "light"}
            {" "}
            theme based on your system preference. This will automatically
            update when your system theme changes.
          </p>
        </div>
      )}
    </div>
  );
}
