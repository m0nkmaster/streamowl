import { IS_BROWSER } from "$fresh/runtime.ts";
import { useState } from "preact/hooks";

interface ListSettingsProps {
  listId: string;
  initialIsPublic: boolean;
}

/**
 * Island component for managing list settings (public/private toggle and shareable URL)
 */
export default function ListSettings({
  listId,
  initialIsPublic,
}: ListSettingsProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!IS_BROWSER) {
    return null;
  }

  const shareableUrl = IS_BROWSER
    ? `${globalThis.location.origin}/lists/${listId}`
    : "";

  const handleToggle = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_public: !isPublic,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || "Failed to update list");
      }

      const data = await response.json();
      setIsPublic(data.list.is_public);

      // Reload page to update UI
      if (IS_BROWSER) {
        globalThis.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      // Fallback: select text
      const input = document.createElement("input");
      input.value = shareableUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">List Settings</h2>

      <div class="space-y-4">
        {/* Public/Private Toggle */}
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <label
              for="public-toggle"
              class="text-sm font-medium text-gray-700"
            >
              Make list public
            </label>
            <p class="text-sm text-gray-500 mt-1">
              {isPublic
                ? "Anyone with the link can view this list"
                : "Only you can view this list"}
            </p>
          </div>
          <button
            type="button"
            id="public-toggle"
            onClick={handleToggle}
            disabled={loading}
            class={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isPublic ? "bg-indigo-600" : "bg-gray-200"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            role="switch"
            aria-checked={isPublic}
            aria-label="Toggle public visibility"
          >
            <span
              class={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isPublic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Shareable URL */}
        {isPublic && (
          <div class="pt-4 border-t border-gray-200">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Shareable URL
            </label>
            <div class="flex gap-2">
              <input
                type="text"
                value={shareableUrl}
                readOnly
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Share this URL to let others view your list
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div class="rounded-md bg-red-50 p-4">
            <p class="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
