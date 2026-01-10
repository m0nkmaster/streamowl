import { useState } from "preact/hooks";

interface NavigationProps {
  currentPath: string;
  isAuthenticated: boolean;
}

export default function Navigation({ currentPath, isAuthenticated }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/browse", label: "Browse", icon: "🔍" },
    { href: "/search", label: "Search", icon: "🔎" },
    ...(isAuthenticated ? [
      { href: "/library", label: "Library", icon: "📚" },
      { href: "/dashboard", label: "Dashboard", icon: "⚙️" },
    ] : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(href);
  };

  return (
    <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Navigation */}
        <div class="hidden md:flex md:items-center md:justify-between md:h-16">
          <div class="flex items-center">
            <a href="/" class="flex items-center space-x-2">
              <span class="text-2xl font-bold text-indigo-600">Stream Owl</span>
            </a>
          </div>
          <div class="flex items-center space-x-1">
            {navLinks.map((link) => (
              <a
                href={link.href}
                class={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center ${
                  isActive(link.href)
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span class="mr-2">{link.icon}</span>
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div class="md:hidden">
          <div class="flex items-center justify-between h-16">
            <a href="/" class="flex items-center space-x-2">
              <span class="text-xl font-bold text-indigo-600">Stream Owl</span>
            </a>
            <button
              type="button"
              class="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 min-w-[44px] min-h-[44px]"
              aria-expanded="false"
              aria-label="Toggle navigation menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <svg
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div class="pb-4 border-t border-gray-200">
              <div class="pt-2 space-y-1">
                {navLinks.map((link) => (
                  <a
                    href={link.href}
                    class={`block px-4 py-3 rounded-md text-base font-medium transition-colors min-h-[44px] flex items-center ${
                      isActive(link.href)
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span class="mr-3 text-xl">{link.icon}</span>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}