/**
 * Deep link generation for streaming providers
 *
 * Provides utilities to generate deep links that open content directly
 * in streaming apps or websites.
 */

/**
 * Deep link template configuration
 */
interface DeepLinkConfig {
  /** URL template with placeholders: {tmdb_id}, {title}, {slug} */
  web: string;
  /** Optional mobile app URL scheme (e.g., "netflix://") */
  app?: string;
}

/**
 * Mapping of streaming provider names to their deep link configurations
 *
 * Note: These are best-effort mappings. Not all providers support direct
 * content deep links, and some may require specific content IDs that differ
 * from TMDB IDs.
 */
const PROVIDER_DEEP_LINKS: Record<string, DeepLinkConfig> = {
  // Major subscription services
  "Netflix": {
    web: "https://www.netflix.com/search?q={title}",
    app: "nflx://search?q={title}",
  },
  "Disney Plus": {
    web: "https://www.disneyplus.com/search?q={title}",
  },
  "Disney+": {
    web: "https://www.disneyplus.com/search?q={title}",
  },
  "Amazon Prime Video": {
    web: "https://www.amazon.com/s?i=instant-video&k={title}",
  },
  "Amazon Video": {
    web: "https://www.amazon.com/s?i=instant-video&k={title}",
  },
  "Apple TV Plus": {
    web: "https://tv.apple.com/search?term={title}",
  },
  "Apple TV+": {
    web: "https://tv.apple.com/search?term={title}",
  },
  "Max": {
    web: "https://www.max.com/search?q={title}",
  },
  "HBO Max": {
    web: "https://www.max.com/search?q={title}",
  },
  "Hulu": {
    web: "https://www.hulu.com/search?q={title}",
  },
  "Paramount Plus": {
    web: "https://www.paramountplus.com/search/?q={title}",
  },
  "Paramount+": {
    web: "https://www.paramountplus.com/search/?q={title}",
  },
  "Peacock": {
    web: "https://www.peacocktv.com/search?q={title}",
  },
  "Peacock Premium": {
    web: "https://www.peacocktv.com/search?q={title}",
  },

  // UK services
  "BBC iPlayer": {
    web: "https://www.bbc.co.uk/iplayer/search?q={title}",
  },
  "ITVX": {
    web: "https://www.itv.com/watch/search?q={title}",
  },
  "ITV Hub": {
    web: "https://www.itv.com/watch/search?q={title}",
  },
  "Channel 4": {
    web: "https://www.channel4.com/search?q={title}",
  },
  "All 4": {
    web: "https://www.channel4.com/search?q={title}",
  },
  "Now TV": {
    web: "https://www.nowtv.com/search?q={title}",
  },
  "Sky Go": {
    web: "https://www.sky.com/watch/search?q={title}",
  },
  "BritBox": {
    web: "https://www.britbox.com/search?q={title}",
  },

  // Other major services
  "Crunchyroll": {
    web: "https://www.crunchyroll.com/search?q={title}",
  },
  "Funimation": {
    web: "https://www.funimation.com/search/?q={title}",
  },
  "Shudder": {
    web: "https://www.shudder.com/search?q={title}",
  },
  "Mubi": {
    web: "https://mubi.com/search?query={title}",
  },
  "Criterion Channel": {
    web: "https://www.criterionchannel.com/search?q={title}",
  },
  "Stan": {
    web: "https://www.stan.com.au/search?q={title}",
  },
  "Crave": {
    web: "https://www.crave.ca/en/search?searchQuery={title}",
  },
  "MGM Plus": {
    web: "https://www.mgmplus.com/search?q={title}",
  },
  "Starz": {
    web: "https://www.starz.com/search?q={title}",
  },
  "Showtime": {
    web: "https://www.sho.com/search?q={title}",
  },

  // Rental/purchase services
  "Google Play Movies": {
    web: "https://play.google.com/store/search?q={title}&c=movies",
  },
  "YouTube": {
    web: "https://www.youtube.com/results?search_query={title}+full+movie",
  },
  "Vudu": {
    web: "https://www.vudu.com/content/movies/search?searchString={title}",
  },
  "Microsoft Store": {
    web: "https://www.microsoft.com/en-gb/search/shop/movies?q={title}",
  },

  // Free/ad-supported services
  "Tubi": {
    web: "https://tubitv.com/search/{title}",
  },
  "Pluto TV": {
    web: "https://pluto.tv/en/search?q={title}",
  },
  "Plex": {
    web: "https://watch.plex.tv/search?q={title}",
  },
  "Freevee": {
    web: "https://www.amazon.com/s?i=instant-video&k={title}&ref=atv_dp_sr_smb",
  },
  "Roku Channel": {
    web: "https://therokuchannel.roku.com/search?query={title}",
  },
};

/**
 * Generate a URL-friendly slug from a title
 *
 * @param title The content title
 * @returns URL-friendly slug
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .trim();
}

/**
 * URL-encode a title for use in query parameters
 *
 * @param title The content title
 * @returns URL-encoded title
 */
function encodeTitle(title: string): string {
  return encodeURIComponent(title);
}

/**
 * Parameters for generating a deep link
 */
export interface DeepLinkParams {
  /** Provider name (e.g., "Netflix", "Disney+") */
  providerName: string;
  /** Content title */
  title: string;
  /** TMDB content ID */
  tmdbId: number;
  /** Content type (movie or tv) */
  contentType: "movie" | "tv";
}

/**
 * Generate a deep link for a specific streaming provider
 *
 * @param params Deep link parameters
 * @returns Deep link URL, or null if provider not supported
 */
export function generateDeepLink(params: DeepLinkParams): string | null {
  const { providerName, title } = params;

  // Look up the provider configuration
  const config = PROVIDER_DEEP_LINKS[providerName];

  if (!config) {
    return null;
  }

  // Generate the deep link by replacing placeholders
  const deepLink = config.web
    .replace(/{title}/g, encodeTitle(title))
    .replace(/{slug}/g, slugify(title))
    .replace(/{tmdb_id}/g, String(params.tmdbId));

  return deepLink;
}

/**
 * Check if a streaming provider has a supported deep link
 *
 * @param providerName Provider name
 * @returns True if deep link is supported
 */
export function hasDeepLinkSupport(providerName: string): boolean {
  return providerName in PROVIDER_DEEP_LINKS;
}

/**
 * Get all supported provider names
 *
 * @returns Array of supported provider names
 */
export function getSupportedProviders(): string[] {
  return Object.keys(PROVIDER_DEEP_LINKS);
}

/**
 * Deep link with additional metadata
 */
export interface DeepLinkResult {
  /** The generated deep link URL */
  url: string;
  /** Whether this is a direct content link vs a search link */
  isDirectLink: boolean;
  /** Optional mobile app URL scheme */
  appUrl?: string;
}

/**
 * Generate a deep link with full metadata
 *
 * @param params Deep link parameters
 * @returns Deep link result with metadata, or null if provider not supported
 */
export function generateDeepLinkWithMetadata(
  params: DeepLinkParams,
): DeepLinkResult | null {
  const { providerName, title } = params;

  const config = PROVIDER_DEEP_LINKS[providerName];

  if (!config) {
    return null;
  }

  const encodedTitle = encodeTitle(title);
  const slug = slugify(title);
  const tmdbIdStr = String(params.tmdbId);

  const url = config.web
    .replace(/{title}/g, encodedTitle)
    .replace(/{slug}/g, slug)
    .replace(/{tmdb_id}/g, tmdbIdStr);

  let appUrl: string | undefined;
  if (config.app) {
    appUrl = config.app
      .replace(/{title}/g, encodedTitle)
      .replace(/{slug}/g, slug)
      .replace(/{tmdb_id}/g, tmdbIdStr);
  }

  // Currently all our links are search-based, so they're not "direct" content links
  // A direct link would open the specific content page rather than search results
  const isDirectLink = false;

  return {
    url,
    isDirectLink,
    appUrl,
  };
}
