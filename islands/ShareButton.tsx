import { useEffect, useRef, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { useToast } from "./Toast.tsx";

interface ShareButtonProps {
  /**
   * The title of the content being shared
   */
  title: string;
  /**
   * The URL path (e.g., /content/123) - will be combined with current origin
   */
  contentPath: string;
  /**
   * Optional description for platforms that support it
   */
  description?: string;
}

interface ShareOption {
  id: string;
  name: string;
  icon: string;
  colour: string;
  getUrl: (title: string, url: string, description: string) => string;
}

/**
 * Generates share URLs for different social platforms
 */
const shareOptions: ShareOption[] = [
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: "𝕏",
    colour: "bg-black hover:bg-gray-800",
    getUrl: (title, url, _description) => {
      const text = `Check out "${title}" on Stream Owl!`;
      return `https://twitter.com/intent/tweet?text=${
        encodeURIComponent(text)
      }&url=${encodeURIComponent(url)}`;
    },
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: "📱",
    colour: "bg-green-500 hover:bg-green-600",
    getUrl: (title, url, _description) => {
      const text = `Check out "${title}" on Stream Owl! ${url}`;
      return `https://wa.me/?text=${encodeURIComponent(text)}`;
    },
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "📘",
    colour: "bg-blue-600 hover:bg-blue-700",
    getUrl: (_title, url, _description) => {
      return `https://www.facebook.com/sharer/sharer.php?u=${
        encodeURIComponent(url)
      }`;
    },
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    colour: "bg-blue-700 hover:bg-blue-800",
    getUrl: (title, url, _description) => {
      return `https://www.linkedin.com/sharing/share-offsite/?url=${
        encodeURIComponent(url)
      }&title=${encodeURIComponent(title)}`;
    },
  },
  {
    id: "email",
    name: "Email",
    icon: "✉️",
    colour: "bg-gray-600 hover:bg-gray-700",
    getUrl: (title, url, description) => {
      const subject = `Check out: ${title}`;
      const body = description
        ? `${description}\n\nWatch it here: ${url}`
        : `I found this on Stream Owl and thought you might like it!\n\nWatch it here: ${url}`;
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${
        encodeURIComponent(body)
      }`;
    },
  },
  {
    id: "copy",
    name: "Copy Link",
    icon: "🔗",
    colour: "bg-indigo-500 hover:bg-indigo-600",
    getUrl: (_title, _url, _description) => "", // Special case - handled separately
  },
];

/**
 * Island component for sharing content to social platforms
 * Displays a share button that opens a dropdown with sharing options
 */
export default function ShareButton(
  { title, contentPath, description = "" }: ShareButtonProps,
) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { showToast, ToastContainer } = useToast();

  // Build full URL from origin and path
  const getFullUrl = (): string => {
    if (!IS_BROWSER) return contentPath;
    return `${globalThis.location.origin}${contentPath}`;
  };

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    if (!IS_BROWSER) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleShare = async (option: ShareOption) => {
    const fullUrl = getFullUrl();

    if (option.id === "copy") {
      // Handle copy to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
        showToast("Link copied to clipboard!", "success");
        setIsOpen(false);
      } catch (error) {
        console.error("Failed to copy link:", error);
        showToast("Failed to copy link", "error");
      }
      return;
    }

    // For other platforms, open the share URL in a new window
    const shareUrl = option.getUrl(title, fullUrl, description);
    globalThis.open(shareUrl, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  // Use native Web Share API if available (primarily for mobile)
  const handleNativeShare = async () => {
    if (!IS_BROWSER) return;

    const fullUrl = getFullUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description || `Check out "${title}" on Stream Owl!`,
          url: fullUrl,
        });
      } catch (error) {
        // User cancelled or share failed - don't show error for user cancellation
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    } else {
      // Fallback to dropdown on devices without Web Share API
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      <ToastContainer />
      <div class="relative inline-block">
        {/* Share Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleNativeShare}
          aria-label="Share this content"
          aria-expanded={isOpen}
          aria-haspopup="true"
          class="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share
        </button>

        {/* Dropdown Menu - shown on desktop/when Web Share API not available */}
        {isOpen && (
          <div
            ref={dropdownRef}
            class="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="share-menu"
          >
            <div class="py-1" role="none">
              <p class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Share to
              </p>
              {shareOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handleShare(option)}
                  class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
                  role="menuitem"
                  aria-label={`Share to ${option.name}`}
                >
                  <span class="w-6 h-6 flex items-center justify-center text-lg">
                    {option.icon}
                  </span>
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
