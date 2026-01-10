import { type Handlers } from "$fresh/server.ts";
import {
  getMovieWatchProvidersByRegion,
  getTvWatchProvidersByRegion,
  type SupportedRegion,
} from "../../../lib/tmdb/client.ts";
import { detectRegionFromRequest } from "../../../lib/region.ts";
import {
  createBadRequestResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

interface ProviderAvailabilityRequest {
  content: Array<{
    tmdb_id: number;
    type: "movie" | "tv";
  }>;
  region?: string;
}

interface ProviderAvailabilityResponse {
  availability: Record<
    number,
    {
      provider_ids: number[];
      providers: Array<{
        provider_id: number;
        provider_name: string;
      }>;
    }
  >;
}

/**
 * API endpoint to fetch watch provider availability for multiple content items
 * Accepts an array of content items and returns their streaming availability
 */
export const handler: Handlers = {
  async POST(req) {
    try {
      const body: ProviderAvailabilityRequest = await req.json();

      // Validate request body
      if (!body.content || !Array.isArray(body.content)) {
        return createBadRequestResponse(
          "Content array is required",
          "content",
        );
      }

      if (body.content.length === 0) {
        return createBadRequestResponse(
          "Content array cannot be empty",
          "content",
        );
      }

      // Limit batch size to prevent abuse
      if (body.content.length > 50) {
        return createBadRequestResponse(
          "Maximum 50 content items per request",
          "content",
        );
      }

      // Detect region from request or use provided region
      const region = body.region ||
        detectRegionFromRequest(req) || "US";

      // Fetch providers for all content items in parallel
      const providerPromises = body.content.map(async (item) => {
        try {
          let providers;
          if (item.type === "movie") {
            providers = await getMovieWatchProvidersByRegion(
              item.tmdb_id,
              region as SupportedRegion,
            );
          } else {
            providers = await getTvWatchProvidersByRegion(
              item.tmdb_id,
              region as SupportedRegion,
            );
          }

          if (!providers) {
            return {
              tmdb_id: item.tmdb_id,
              provider_ids: [],
              providers: [],
            };
          }

          // Collect all provider IDs from all categories
          const allProviders = [
            ...providers.subscription,
            ...providers.rent,
            ...providers.buy,
            ...providers.ads,
            ...providers.free,
          ];

          // Extract unique provider IDs
          const providerIds = new Set<number>();
          const providerMap = new Map<
            number,
            { provider_id: number; provider_name: string }
          >();

          allProviders.forEach((provider) => {
            providerIds.add(provider.provider_id);
            if (!providerMap.has(provider.provider_id)) {
              providerMap.set(provider.provider_id, {
                provider_id: provider.provider_id,
                provider_name: provider.provider_name,
              });
            }
          });

          return {
            tmdb_id: item.tmdb_id,
            provider_ids: Array.from(providerIds),
            providers: Array.from(providerMap.values()),
          };
        } catch (error) {
          // If fetching providers fails for one item, return empty availability
          console.error(
            `Failed to fetch providers for ${item.type} ${item.tmdb_id}:`,
            error,
          );
          return {
            tmdb_id: item.tmdb_id,
            provider_ids: [],
            providers: [],
          };
        }
      });

      const results = await Promise.all(providerPromises);

      // Build response object keyed by tmdb_id
      const availability: Record<
        number,
        {
          provider_ids: number[];
          providers: Array<{
            provider_id: number;
            provider_name: string;
          }>;
        }
      > = {};

      results.forEach((result) => {
        availability[result.tmdb_id] = {
          provider_ids: result.provider_ids,
          providers: result.providers,
        };
      });

      const response: ProviderAvailabilityResponse = {
        availability,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
      });
    } catch (error) {
      return createInternalServerErrorResponse(
        "Failed to fetch provider availability",
        error,
      );
    }
  },
};
