import { Head } from "$fresh/runtime.ts";

/**
 * SEO component props for meta tags
 */
interface SEOProps {
  /** Page title - will be appended with site name */
  title?: string;
  /** Page description for search engines and social sharing */
  description?: string;
  /** Canonical URL of the page */
  url?: string;
  /** Open Graph image URL for social sharing */
  image?: string;
  /** Image alt text for accessibility */
  imageAlt?: string;
  /** Content type - article for content pages, website for general pages */
  type?: "website" | "article" | "video.movie" | "video.tv_show";
  /** Twitter card type */
  twitterCard?: "summary" | "summary_large_image";
  /** Disable indexing for private pages */
  noIndex?: boolean;
  /** Additional structured data (JSON-LD) */
  structuredData?: Record<string, unknown>;
}

const SITE_NAME = "Stream Owl";
const DEFAULT_DESCRIPTION =
  "Wise recommendations, one stream at a time. Discover where movies, TV shows, and documentaries are available across streaming services.";
const DEFAULT_IMAGE = "/logo.svg";
const BASE_URL = Deno.env.get("BASE_URL") || "https://streamowl.app";

/**
 * SEO component for managing page meta tags
 * Includes Open Graph and Twitter Card tags for social sharing
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  url,
  image = DEFAULT_IMAGE,
  imageAlt,
  type = "website",
  twitterCard = "summary_large_image",
  noIndex = false,
  structuredData,
}: SEOProps) {
  // Build full title with site name
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

  // Build full URL
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;

  // Build full image URL (handle absolute vs relative URLs)
  const fullImage = image.startsWith("http") ? image : `${BASE_URL}${image}`;

  // Build image alt text
  const fullImageAlt = imageAlt || title || SITE_NAME;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:alt" content={fullImageAlt} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={fullImageAlt} />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}
    </Head>
  );
}

/**
 * Helper to generate structured data for a movie
 */
export function generateMovieStructuredData(movie: {
  title: string;
  description?: string;
  releaseDate?: string;
  rating?: number;
  posterUrl?: string;
  genres?: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.description,
    datePublished: movie.releaseDate,
    aggregateRating: movie.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: movie.rating,
          bestRating: 10,
          worstRating: 0,
        }
      : undefined,
    image: movie.posterUrl,
    genre: movie.genres,
  };
}

/**
 * Helper to generate structured data for a TV series
 */
export function generateTvSeriesStructuredData(tvShow: {
  title: string;
  description?: string;
  firstAirDate?: string;
  rating?: number;
  posterUrl?: string;
  genres?: string[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: tvShow.title,
    description: tvShow.description,
    datePublished: tvShow.firstAirDate,
    aggregateRating: tvShow.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: tvShow.rating,
          bestRating: 10,
          worstRating: 0,
        }
      : undefined,
    image: tvShow.posterUrl,
    genre: tvShow.genres,
  };
}
