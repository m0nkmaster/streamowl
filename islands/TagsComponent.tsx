import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface Tag {
  id: string;
  name: string;
  colour: string;
}

interface TagsComponentProps {
  tmdbId: number;
  initialTags: Tag[];
}

// Predefined colour options for tags
const TAG_COLOURS = [
  "#3B82F6", // Blue (default)
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Amber
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

/**
 * Island component for managing tags on content
 * Allows users to create new tags, apply existing tags, and remove tags
 */
export default function TagsComponent(
  { tmdbId, initialTags }: TagsComponentProps,
) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [allUserTags, setAllUserTags] = useState<Tag[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColour, setNewTagColour] = useState(TAG_COLOURS[0]);
  const [showTagSelector, setShowTagSelector] = useState(false);

  // Update local state when initialTags prop changes
  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  // Fetch user's tags on mount
  useEffect(() => {
    if (!IS_BROWSER) return;

    const fetchUserTags = async () => {
      setIsLoadingTags(true);
      try {
        const response = await fetch("/api/tags");
        if (response.ok) {
          const data = await response.json();
          setAllUserTags(data.tags || []);
        }
      } catch (err) {
        console.error("Error fetching user tags:", err);
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchUserTags();
  }, []);

  const handleCreateTag = async () => {
    if (!IS_BROWSER || isLoading || !newTagName.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          colour: newTagColour,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create tag");
      }

      const data = await response.json();
      const newTag = data.tag;

      // Add to user tags list
      setAllUserTags((prev) =>
        [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name))
      );

      // Apply tag to content immediately
      await handleApplyTag(newTag.id);

      // Reset form
      setNewTagName("");
      setNewTagColour(TAG_COLOURS[0]);
      setIsCreating(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create tag. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTag = async (tagId: string) => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    setError(null);
    const previousTags = [...tags];

    // Optimistic update
    const tagToAdd = allUserTags.find((t) => t.id === tagId);
    if (tagToAdd && !tags.some((t) => t.id === tagId)) {
      setTags([...tags, tagToAdd].sort((a, b) => a.name.localeCompare(b.name)));
    }

    try {
      const response = await fetch(`/api/content/${tmdbId}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tag_id: tagId }),
      });

      if (!response.ok) {
        // Revert on error
        setTags(previousTags);
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to apply tag");
      }

      const data = await response.json();
      // Update tag in list if it was just created
      if (!tags.some((t) => t.id === tagId)) {
        setTags(
          [...tags, data.tag].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      setShowTagSelector(false);
    } catch (err) {
      // Revert on error
      setTags(previousTags);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to apply tag. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    setError(null);
    const previousTags = [...tags];

    // Optimistic update
    setTags(tags.filter((t) => t.id !== tagId));

    try {
      const response = await fetch(`/api/content/${tmdbId}/tags/${tagId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert on error
        setTags(previousTags);
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove tag");
      }
    } catch (err) {
      // Revert on error
      setTags(previousTags);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove tag. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Get tags that aren't already applied
  const availableTags = allUserTags.filter(
    (tag) => !tags.some((appliedTag) => appliedTag.id === tag.id),
  );

  if (!IS_BROWSER) {
    // Server-side render: show static view
    return (
      <div class="flex flex-col gap-3">
        <label class="text-sm font-medium text-gray-700">Tags</label>
        {tags.length > 0
          ? (
            <div class="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  class="px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={`background-color: ${tag.colour}`}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )
          : <p class="text-sm text-gray-500">No tags yet</p>}
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-gray-700">Tags</label>
        <div class="flex gap-2">
          {!isCreating && (
            <>
              <button
                type="button"
                onClick={() => setShowTagSelector(!showTagSelector)}
                disabled={isLoading || isLoadingTags}
                class="text-sm text-indigo-600 hover:text-indigo-700 underline disabled:opacity-50"
              >
                Add Tag
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                disabled={isLoading || isLoadingTags}
                class="text-sm text-indigo-600 hover:text-indigo-700 underline disabled:opacity-50"
              >
                Create New
              </button>
            </>
          )}
        </div>
      </div>

      {/* Display applied tags */}
      {tags.length > 0 && (
        <div class="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white group"
              style={`background-color: ${tag.colour}`}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                disabled={isLoading}
                class="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                aria-label={`Remove ${tag.name} tag`}
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tag selector dropdown */}
      {showTagSelector && !isCreating && (
        <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-md">
          {isLoadingTags
            ? <p class="text-sm text-gray-500">Loading tags...</p>
            : availableTags.length > 0
            ? (
              <div class="flex flex-col gap-2">
                <p class="text-xs text-gray-600 mb-1">Select a tag to apply:</p>
                <div class="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleApplyTag(tag.id)}
                      disabled={isLoading}
                      class="px-3 py-1 rounded-full text-sm font-medium text-white hover:opacity-80 disabled:opacity-50 transition-opacity"
                      style={`background-color: ${tag.colour}`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowTagSelector(false)}
                  class="text-xs text-gray-500 hover:text-gray-700 mt-2"
                >
                  Cancel
                </button>
              </div>
            )
            : (
              <div class="flex flex-col gap-2">
                <p class="text-sm text-gray-600">
                  No tags available. Create a new tag to get started.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowTagSelector(false);
                    setIsCreating(true);
                  }}
                  class="text-sm text-indigo-600 hover:text-indigo-700 underline"
                >
                  Create New Tag
                </button>
              </div>
            )}
        </div>
      )}

      {/* Create new tag form */}
      {isCreating && (
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-md">
          <div class="flex flex-col gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Tag Name
              </label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.currentTarget.value)}
                disabled={isLoading}
                maxLength={255}
                placeholder="e.g., Comfort Watch"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Tag name input"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Colour
              </label>
              <div class="flex flex-wrap gap-2">
                {TAG_COLOURS.map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    onClick={() => setNewTagColour(colour)}
                    disabled={isLoading}
                    class={`w-8 h-8 rounded-full border-2 transition-all ${
                      newTagColour === colour
                        ? "border-gray-900 scale-110"
                        : "border-gray-300 hover:border-gray-500"
                    } disabled:opacity-50`}
                    style={`background-color: ${colour}`}
                    aria-label={`Select colour ${colour}`}
                  />
                ))}
              </div>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isLoading || !newTagName.trim()}
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Creating..." : "Create & Apply"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewTagName("");
                  setNewTagColour(TAG_COLOURS[0]);
                  setError(null);
                }}
                disabled={isLoading}
                class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {tags.length === 0 && !isCreating && !showTagSelector && (
        <p class="text-sm text-gray-500 italic">
          Add tags to organise your content
        </p>
      )}

      {/* Error message */}
      {error && (
        <div class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </div>
      )}
    </div>
  );
}
