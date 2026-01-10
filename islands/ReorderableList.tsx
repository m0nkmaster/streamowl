import { IS_BROWSER } from "$fresh/runtime.ts";
import { useEffect, useState } from "preact/hooks";
import ContentGrid from "../components/ContentGrid.tsx";

interface ListItem {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  position: number;
}

interface ReorderableListProps {
  listId: string;
  items: ListItem[];
  isOwner: boolean;
}

/**
 * Island component for displaying and reordering list items with drag-and-drop
 */
export default function ReorderableList({
  listId,
  items: initialItems,
  isOwner,
}: ReorderableListProps) {
  const [items, setItems] = useState<ListItem[]>(initialItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Update items when initialItems change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const getPosterUrl = (posterPath: string | null): string => {
    if (!posterPath) {
      return "https://via.placeholder.com/300x450?text=No+Poster";
    }
    return `https://image.tmdb.org/t/p/w300${posterPath}`;
  };

  const handleDragStart = (e: DragEvent, index: number) => {
    if (!IS_BROWSER || !isOwner) return;

    e.stopPropagation();
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", "");
    }

    // Prevent link navigation during drag
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    if (link) {
      link.style.pointerEvents = "none";
    }
  };

  const handleDragEnd = (e: DragEvent) => {
    if (!IS_BROWSER) return;

    setDraggedIndex(null);
    setDragOverIndex(null);

    // Re-enable link navigation
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    if (link) {
      link.style.pointerEvents = "";
    }
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    if (!IS_BROWSER || !isOwner || draggedIndex === null) return;

    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    if (!IS_BROWSER) return;
    setDragOverIndex(null);
  };

  const handleDrop = async (e: DragEvent, dropIndex: number) => {
    if (!IS_BROWSER || !isOwner || draggedIndex === null) return;

    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Create new items array with reordered positions
    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    // Update positions
    const reorderedItems = newItems.map((item, index) => ({
      ...item,
      position: index,
    }));

    // Optimistically update UI
    setItems(reorderedItems);
    setIsReordering(true);

    try {
      // Send reorder request to API
      const response = await fetch(`/api/lists/${listId}/items`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: reorderedItems.map((item) => ({
            tmdb_id: item.tmdb_id,
            position: item.position,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reorder items");
      }

      // Success - items are already updated optimistically
    } catch (error) {
      console.error("Error reordering items:", error);
      // Revert to original order on error
      setItems(initialItems);
    } finally {
      setIsReordering(false);
      setDraggedIndex(null);
    }
  };

  if (items.length === 0) {
    return (
      <div class="text-center py-12">
        <p class="text-gray-600 mb-2">This list is empty.</p>
        {isOwner && (
          <p class="text-gray-500 text-sm">
            Add content to this list to see it here.
          </p>
        )}
      </div>
    );
  }

  return (
    <div class={isReordering ? "opacity-75" : ""}>
      <ContentGrid>
        {items.map((item, index) => {
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const isDraggable = isOwner && !isReordering;

          return (
            <div
              key={`${item.type}-${item.tmdb_id}`}
              draggable={isDraggable}
              onDragStart={(e) => handleDragStart(e as DragEvent, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e as DragEvent, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e as DragEvent, index)}
              class={`block group transition-all ${
                isDragging ? "opacity-50 cursor-grabbing" : ""
              } ${isDragOver ? "scale-105 z-10" : ""} ${
                isDraggable ? "cursor-grab" : ""
              }`}
            >
              <a
                href={`/content/${item.tmdb_id}`}
                class={`block ${isDragging ? "pointer-events-none" : ""}`}
                onClick={(e) => {
                  // Prevent navigation when dragging or reordering
                  if (isDragging || isReordering) {
                    e.preventDefault();
                  }
                }}
              >
                <div class="bg-white rounded-lg shadow-md overflow-hidden relative">
                  {isDragOver && (
                    <div class="absolute inset-0 border-2 border-indigo-500 rounded-lg z-10 pointer-events-none" />
                  )}
                  <img
                    src={getPosterUrl(item.poster_path)}
                    alt={item.title}
                    class="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                    draggable={false}
                  />
                  <div class="p-3">
                    <h3 class="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-indigo-600">
                      {item.title}
                    </h3>
                    {item.release_date && (
                      <p class="text-xs text-gray-500 mt-1">
                        {new Date(item.release_date).getFullYear()}
                      </p>
                    )}
                  </div>
                </div>
              </a>
            </div>
          );
        })}
      </ContentGrid>
      {isOwner && items.length > 1 && (
        <p class="text-sm text-gray-500 mt-4 text-center">
          Drag items to reorder
        </p>
      )}
    </div>
  );
}
