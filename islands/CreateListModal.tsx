import { useState } from "preact/hooks";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListCreated: () => void;
}

/**
 * Modal component for creating a new custom list
 */
export default function CreateListModal({
  isOpen,
  onClose,
  onListCreated,
}: CreateListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!IS_BROWSER || !isOpen) {
    return null;
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create list");
      }

      // Reset form
      setName("");
      setDescription("");
      onListCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setError(null);
    onClose();
  };

  return (
    <div
      class={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? "" : "hidden"}`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              onClick={handleClose}
              class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span class="sr-only">Close</span>
              <svg
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="sm:flex sm:items-start">
            <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3
                class="text-base font-semibold leading-6 text-gray-900"
                id="modal-title"
              >
                Create New List
              </h3>
              <div class="mt-4">
                <form onSubmit={handleSubmit}>
                  <div class="space-y-4">
                    <div>
                      <label
                        for="list-name"
                        class="block text-sm font-medium text-gray-700"
                      >
                        List Name *
                      </label>
                      <input
                        type="text"
                        id="list-name"
                        required
                        value={name}
                        onInput={(e) =>
                          setName((e.target as HTMLInputElement).value)}
                        maxLength={255}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        placeholder="e.g., 80s Horror"
                      />
                    </div>

                    <div>
                      <label
                        for="list-description"
                        class="block text-sm font-medium text-gray-700"
                      >
                        Description (optional)
                      </label>
                      <textarea
                        id="list-description"
                        rows={3}
                        value={description}
                        onInput={(e) =>
                          setDescription(
                            (e.target as HTMLTextAreaElement).value,
                          )}
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        placeholder="Add a description for your list..."
                      />
                    </div>

                    {error && (
                      <div class="rounded-md bg-red-50 p-4">
                        <p class="text-sm text-red-800">{error}</p>
                      </div>
                    )}
                  </div>

                  <div class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="submit"
                      disabled={loading || !name.trim()}
                      class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Creating..." : "Create List"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
