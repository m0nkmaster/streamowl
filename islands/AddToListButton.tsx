import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface List {
  id: string;
  name: string;
  description: string | null;
  item_count: number;
}

interface AddToListButtonProps {
  tmdbId: number;
}

/**
 * Island component for adding content to custom lists
 * Shows a dropdown with user's lists and allows adding content to selected list
 */
export default function AddToListButton({ tmdbId }: AddToListButtonProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingLists, setIsFetchingLists] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch user's lists on mount
  useEffect(() => {
    if (!IS_BROWSER) return;

    const fetchLists = async () => {
      try {
        const response = await fetch("/api/library/lists");
        if (!response.ok) {
          throw new Error("Failed to fetch lists");
        }
        const data = await response.json();
        setLists(data.lists || []);
      } catch (error) {
        console.error("Error fetching lists:", error);
        setError("Failed to load lists");
      } finally {
        setIsFetchingLists(false);
      }
    };

    fetchLists();
  }, []);

  const handleAddToList = async (listId: string) => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tmdb_id: tmdbId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add to list");
      }

      // Success - show feedback and close dropdown
      const selectedList = lists.find((l) => l.id === listId);
      setSuccess(`Added to "${selectedList?.name || "list"}"`);
      setShowDropdown(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error adding to list:", error);
      setError(
        error instanceof Error ? error.message : "Failed to add to list",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingLists) {
    return (
      <button
        type="button"
        disabled
        class="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-500 cursor-not-allowed"
      >
        Loading lists...
      </button>
    );
  }

  if (lists.length === 0) {
    return (
      <div class="relative">
        <button
          type="button"
          disabled
          class="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-500 cursor-not-allowed"
          title="Create a list first to add content"
        >
          Add to List (No lists)
        </button>
      </div>
    );
  }

  return (
    <div class="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isLoading}
        aria-label="Add to list"
        aria-expanded={showDropdown}
        aria-haspopup="true"
        aria-busy={isLoading}
        class={`px-4 py-2 rounded-lg font-medium transition-colors ${
          showDropdown
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isLoading ? "Adding..." : "Add to List"}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            class="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          {/* Dropdown menu */}
          <div
            role="menu"
            aria-label="Select a list to add content to"
            class="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto"
          >
            <div class="p-2">
              <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Select a list
              </div>
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleAddToList(list.id)}
                  disabled={isLoading}
                  aria-label={`Add to ${list.name}`}
                  class="w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div class="font-medium text-gray-900">{list.name}</div>
                  {list.description && (
                    <div class="text-sm text-gray-500 line-clamp-1">
                      {list.description}
                    </div>
                  )}
                  <div class="text-xs text-gray-400 mt-1">
                    {list.item_count} item{list.item_count !== 1 ? "s" : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Success message */}
      {success && (
        <div
          role="status"
          aria-live="polite"
          class="absolute left-0 mt-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm whitespace-nowrap z-30"
        >
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          class="absolute left-0 mt-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm whitespace-nowrap z-30"
        >
          {error}
        </div>
      )}
    </div>
  );
}
