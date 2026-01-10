import type { ComponentChildren } from "preact";

interface ContentGridProps {
  children: ComponentChildren;
  className?: string;
}

/**
 * Responsive content grid component for displaying posters
 * - Mobile: 2-3 columns
 * - Desktop: 5-6 columns
 */
export default function ContentGrid(
  { children, className = "" }: ContentGridProps,
) {
  return (
    <div
      class={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${className}`}
    >
      {children}
    </div>
  );
}
