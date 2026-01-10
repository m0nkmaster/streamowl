/**
 * Image URL utilities for TMDB images
 * Supports responsive image sizes for optimal performance
 */

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/**
 * TMDB poster size options
 * - w92: 92px wide (thumbnail)
 * - w154: 154px wide (small)
 * - w185: 185px wide (small poster)
 * - w300: 300px wide (medium poster)
 * - w500: 500px wide (large poster)
 * - w780: 780px wide (original poster)
 */
export type PosterSize = "w92" | "w154" | "w185" | "w300" | "w500" | "w780";

/**
 * TMDB backdrop size options
 * - w300: 300px wide
 * - w780: 780px wide
 * - w1280: 1280px wide (standard)
 * - original: Original resolution
 */
export type BackdropSize = "w300" | "w780" | "w1280" | "original";

/**
 * Get poster image URL with specified size
 */
export function getPosterUrl(
  posterPath: string | null,
  size: PosterSize = "w500",
): string {
  if (!posterPath) {
    return "https://via.placeholder.com/300x450?text=No+Poster";
  }
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

/**
 * Get responsive poster image srcset for different viewport sizes
 * Returns srcset string suitable for use in <img srcset> attribute
 */
export function getPosterSrcSet(posterPath: string | null): string {
  if (!posterPath) {
    return "";
  }
  // Generate srcset with appropriate sizes for different viewports
  // Mobile: w185 (small posters in grid)
  // Tablet: w300 (medium posters)
  // Desktop: w500 (large posters)
  return `${TMDB_IMAGE_BASE}/w185${posterPath} 185w, ${TMDB_IMAGE_BASE}/w300${posterPath} 300w, ${TMDB_IMAGE_BASE}/w500${posterPath} 500w`;
}

/**
 * Get backdrop image URL with specified size
 */
export function getBackdropUrl(
  backdropPath: string | null,
  size: BackdropSize = "w1280",
): string {
  if (!backdropPath) {
    return "";
  }
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

/**
 * Get responsive backdrop image srcset
 */
export function getBackdropSrcSet(backdropPath: string | null): string {
  if (!backdropPath) {
    return "";
  }
  // Generate srcset for backdrop images
  // Mobile: w780 (smaller backdrop)
  // Desktop: w1280 (standard backdrop)
  return `${TMDB_IMAGE_BASE}/w780${backdropPath} 780w, ${TMDB_IMAGE_BASE}/w1280${backdropPath} 1280w`;
}

/**
 * Get appropriate poster size for grid thumbnails based on viewport
 * Returns the default size to use in src attribute (for browsers that don't support srcset)
 */
export function getGridPosterSize(): PosterSize {
  // Default to medium size for grid items
  return "w300";
}

/**
 * Get appropriate poster size for detail pages
 */
export function getDetailPosterSize(): PosterSize {
  // Use larger size for detail pages
  return "w500";
}
