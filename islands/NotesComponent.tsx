import { useEffect, useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface NotesComponentProps {
  tmdbId: number;
  initialNotes: string | null;
}

/**
 * Island component for adding and editing private notes on content
 * Notes are private to each user and not visible to others
 */
export default function NotesComponent(
  { tmdbId, initialNotes }: NotesComponentProps,
) {
  const [notes, setNotes] = useState<string | null>(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when initialNotes prop changes
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleSave = async (notesText: string) => {
    if (!IS_BROWSER || isLoading) return;

    setIsLoading(true);
    setError(null);
    const previousNotes = notes;

    // Normalise: empty string becomes null
    const normalisedNotes = notesText.trim() === "" ? null : notesText.trim();

    // Optimistic update
    setNotes(normalisedNotes);
    setIsEditing(false);

    try {
      const response = await fetch(`/api/content/${tmdbId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: normalisedNotes }),
      });

      if (!response.ok) {
        // Revert on error
        setNotes(previousNotes);
        setIsEditing(true);
        const errorData = await response.json();
        setError(errorData.error || "Failed to save notes. Please try again.");
      }
    } catch (err) {
      // Revert on error
      setNotes(previousNotes);
      setIsEditing(true);
      setError("An error occurred. Please try again.");
      console.error("Error saving notes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    setIsEditing(false);
    setError(null);
  };

  if (!IS_BROWSER) {
    // Server-side render: show static view
    return (
      <div class="flex flex-col gap-3">
        <label class="text-sm font-medium text-gray-700">Your Notes</label>
        {notes
          ? (
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p class="text-gray-700 whitespace-pre-wrap">{notes}</p>
            </div>
          )
          : <p class="text-sm text-gray-500">No notes yet</p>}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">Your Notes</label>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            aria-label={notes ? "Edit notes" : "Add note"}
            class="text-sm text-indigo-600 hover:text-indigo-700 underline disabled:opacity-50"
          >
            {notes ? "Edit" : "Add Note"}
          </button>
        </div>
        {notes
          ? (
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p class="text-gray-700 whitespace-pre-wrap">{notes}</p>
            </div>
          )
          : (
            <p class="text-sm text-gray-500 italic">
              Add your private notes about this content
            </p>
          )}
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-3">
      <label for="notes-textarea" class="text-sm font-medium text-gray-700">
        Your Notes
      </label>
      <textarea
        id="notes-textarea"
        value={notes || ""}
        onChange={(e) => setNotes(e.currentTarget.value)}
        disabled={isLoading}
        rows={6}
        maxLength={10000}
        placeholder="Add your private notes about this content..."
        aria-describedby="notes-help notes-error"
        aria-invalid={error !== null}
        aria-busy={isLoading}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y"
      />
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          <button
            type="button"
            onClick={() => handleSave(notes || "")}
            disabled={isLoading}
            aria-label="Save notes"
            aria-busy={isLoading}
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            aria-label="Cancel editing notes"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
        <span id="notes-help" class="text-xs text-gray-500">
          {notes ? notes.length : 0} / 10,000 characters
        </span>
      </div>
      {error && (
        <div
          id="notes-error"
          role="alert"
          aria-live="assertive"
          class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2"
        >
          {error}
        </div>
      )}
    </div>
  );
}
