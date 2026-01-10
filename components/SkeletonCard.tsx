/**
 * Skeleton loading card component for content posters
 * Displays animated placeholder while content loads
 */
export default function SkeletonCard() {
  return (
    <div class="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div class="relative w-full aspect-[2/3] bg-gray-300" />
      <div class="p-3">
        <div class="h-4 bg-gray-300 rounded mb-2" />
        <div class="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}
