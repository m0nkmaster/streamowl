/**
 * Skeleton loading component for content detail page
 * Displays animated placeholders for poster, title, metadata, and content sections
 */
export default function SkeletonContentDetail() {
  return (
    <div class="min-h-screen bg-gray-50 animate-pulse">
      {/* Backdrop Skeleton */}
      <div class="h-96 bg-gray-300" />

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-col md:flex-row gap-8">
          {/* Poster Skeleton */}
          <div class="flex-shrink-0">
            <div class="w-64 md:w-80 h-96 md:h-[32rem] bg-gray-300 rounded-lg" />
          </div>

          {/* Content Details Skeleton */}
          <div class="flex-1">
            {/* Title Skeleton */}
            <div class="h-10 bg-gray-300 rounded mb-4 w-3/4" />

            {/* Metadata Row Skeleton */}
            <div class="flex flex-wrap gap-4 mb-6">
              <div class="h-5 bg-gray-200 rounded w-32" />
              <div class="h-5 bg-gray-200 rounded w-24" />
              <div class="h-5 bg-gray-200 rounded w-28" />
              <div class="h-5 bg-gray-200 rounded w-20" />
            </div>

            {/* Genres Skeleton */}
            <div class="flex flex-wrap gap-2 mb-6">
              <div class="h-6 bg-gray-200 rounded-full w-20" />
              <div class="h-6 bg-gray-200 rounded-full w-24" />
              <div class="h-6 bg-gray-200 rounded-full w-16" />
            </div>

            {/* Action Buttons Skeleton */}
            <div class="mb-6 space-y-4">
              <div class="flex gap-3 flex-wrap">
                <div class="h-10 bg-gray-200 rounded w-32" />
                <div class="h-10 bg-gray-200 rounded w-36" />
                <div class="h-10 bg-gray-200 rounded w-28" />
                <div class="h-10 bg-gray-200 rounded w-24" />
              </div>
              <div class="border-t pt-4">
                <div class="h-8 bg-gray-200 rounded w-48" />
              </div>
            </div>

            {/* Synopsis Skeleton */}
            <div class="mb-8">
              <div class="h-7 bg-gray-300 rounded mb-3 w-32" />
              <div class="space-y-2">
                <div class="h-4 bg-gray-200 rounded w-full" />
                <div class="h-4 bg-gray-200 rounded w-full" />
                <div class="h-4 bg-gray-200 rounded w-5/6" />
                <div class="h-4 bg-gray-200 rounded w-4/6" />
              </div>
            </div>

            {/* Cast Skeleton */}
            <div class="mb-8">
              <div class="h-7 bg-gray-300 rounded mb-4 w-24" />
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    class="bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    <div class="w-full aspect-[2/3] bg-gray-300" />
                    <div class="p-3">
                      <div class="h-4 bg-gray-200 rounded mb-2" />
                      <div class="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Similar Titles Skeleton */}
            <div class="mb-8">
              <div class="h-7 bg-gray-300 rounded mb-4 w-40" />
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    class="bg-white rounded-lg shadow-md overflow-hidden"
                  >
                    <div class="w-full aspect-[2/3] bg-gray-300" />
                    <div class="p-3">
                      <div class="h-4 bg-gray-200 rounded mb-1" />
                      <div class="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
