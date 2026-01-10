import { type Handlers } from "$fresh/server.ts";
import { handleConditionalRequest } from "../../lib/api/caching.ts";
import { CachePresets } from "../../lib/api/caching.ts";
import { query } from "../../lib/db.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../lib/api/errors.ts";

interface LeavingSoonContent {
  tmdb_id: number;
  type: string;
  title: string;
  overview: string | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  available_until: string;
  service_id: string;
  service_name: string;
  service_logo: string | null;
  region: string;
}

interface StreamingService {
  id: string;
  name: string;
  logo_url: string | null;
}

interface LeavingSoonResponse {
  results: LeavingSoonContent[];
  streaming_services: StreamingService[];
  total_results: number;
}

/**
 * API handler for content leaving streaming services soon
 * Returns content with departure dates within the next 30 days
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const url = new URL(req.url);
      const serviceId = url.searchParams.get("service_id");
      const daysAhead = parseInt(
        url.searchParams.get("days_ahead") || "30",
        10,
      );

      // Validate days ahead
      if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 90) {
        return createBadRequestResponse(
          "days_ahead must be a positive integer between 1 and 90",
          "days_ahead",
        );
      }

      // Build the query for content leaving soon
      // We need content where available_until is between today and X days from now
      let leavingSoonQuery = `
        SELECT 
          c.tmdb_id,
          c.type::text,
          c.title,
          c.overview,
          c.release_date::text,
          c.poster_path,
          c.backdrop_path,
          cs.available_until::text,
          cs.service_id::text,
          ss.name as service_name,
          ss.logo_url as service_logo,
          cs.region
        FROM content_streaming cs
        JOIN content c ON c.id = cs.content_id
        JOIN streaming_services ss ON ss.id = cs.service_id
        WHERE cs.available_until IS NOT NULL
          AND cs.available_until >= CURRENT_DATE
          AND cs.available_until <= CURRENT_DATE + $1 * INTERVAL '1 day'
      `;

      const queryParams: unknown[] = [daysAhead];

      // Add optional service filter
      if (serviceId) {
        leavingSoonQuery += ` AND cs.service_id = $2`;
        queryParams.push(serviceId);
      }

      // Order by departure date (soonest first)
      leavingSoonQuery += ` ORDER BY cs.available_until ASC, c.title ASC`;

      // Limit results
      leavingSoonQuery += ` LIMIT 50`;

      // Fetch leaving soon content
      const leavingSoonResults = await query<LeavingSoonContent>(
        leavingSoonQuery,
        queryParams,
      );

      // Fetch all streaming services for the filter dropdown
      const streamingServices = await query<StreamingService>(
        `SELECT id::text, name, logo_url FROM streaming_services ORDER BY name ASC`,
      );

      const response: LeavingSoonResponse = {
        results: leavingSoonResults,
        streaming_services: streamingServices,
        total_results: leavingSoonResults.length,
      };

      return await handleConditionalRequest(
        req,
        response,
        CachePresets.PUBLIC_2H,
      );
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to fetch leaving soon content",
        error,
      );
    }
  },
};
