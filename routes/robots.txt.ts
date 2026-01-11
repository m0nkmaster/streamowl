import { type Handlers } from "$fresh/server.ts";

/**
 * Robots.txt route handler
 * 
 * Provides instructions to web crawlers and references the sitemap.
 */
export const handler: Handlers = {
  GET(req) {
    const baseUrl = Deno.env.get("APP_BASE_URL") || new URL(req.url).origin;
    
    const robotsTxt = `# Stream Owl robots.txt
User-agent: *
Allow: /

# Disallow private/authenticated areas
Disallow: /api/
Disallow: /admin/
Disallow: /settings
Disallow: /library
Disallow: /dashboard

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml
`;
    
    return new Response(robotsTxt, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  },
};
