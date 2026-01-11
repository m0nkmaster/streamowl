import { type Handlers } from "$fresh/server.ts";
import { getTrending } from "../lib/tmdb/client.ts";

/**
 * Sitemap XML route handler
 * 
 * Generates a dynamic XML sitemap for search engine indexing.
 * Includes static pages and popular content.
 */

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a single URL entry for the sitemap
 */
function generateUrlEntry(url: SitemapUrl): string {
  let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>\n`;
  
  if (url.lastmod) {
    entry += `    <lastmod>${url.lastmod}</lastmod>\n`;
  }
  
  if (url.changefreq) {
    entry += `    <changefreq>${url.changefreq}</changefreq>\n`;
  }
  
  if (url.priority !== undefined) {
    entry += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
  }
  
  entry += `  </url>\n`;
  return entry;
}

/**
 * Get static page URLs for the sitemap
 */
function getStaticUrls(baseUrl: string): SitemapUrl[] {
  const today = new Date().toISOString().split("T")[0];
  
  return [
    {
      loc: baseUrl,
      lastmod: today,
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${baseUrl}/browse`,
      lastmod: today,
      changefreq: "daily",
      priority: 0.9,
    },
    {
      loc: `${baseUrl}/search`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.8,
    },
    {
      loc: `${baseUrl}/premium`,
      lastmod: today,
      changefreq: "monthly",
      priority: 0.7,
    },
    {
      loc: `${baseUrl}/login`,
      lastmod: today,
      changefreq: "monthly",
      priority: 0.5,
    },
    {
      loc: `${baseUrl}/signup`,
      lastmod: today,
      changefreq: "monthly",
      priority: 0.5,
    },
  ];
}

export const handler: Handlers = {
  async GET(req) {
    const baseUrl = Deno.env.get("APP_BASE_URL") || new URL(req.url).origin;
    const today = new Date().toISOString().split("T")[0];
    
    // Start with static URLs
    const urls: SitemapUrl[] = getStaticUrls(baseUrl);
    
    // Add trending/popular content URLs
    try {
      // Fetch trending content to include in sitemap
      const trending = await getTrending("week", 1);
      
      for (const content of trending.results.slice(0, 40)) {
        urls.push({
          loc: `${baseUrl}/content/${content.tmdb_id}`,
          lastmod: content.release_date || today,
          changefreq: "weekly",
          priority: 0.6,
        });
      }
    } catch (error) {
      // Log error but continue with static URLs
      console.error("Failed to fetch trending content for sitemap:", error);
    }
    
    // Generate XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    for (const url of urls) {
      xml += generateUrlEntry(url);
    }
    
    xml += '</urlset>\n';
    
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  },
};
