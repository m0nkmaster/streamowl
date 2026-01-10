import { type Handlers } from "$fresh/server.ts";
import { createNotFoundResponse } from "../../lib/api/errors.ts";

/**
 * Catch-all handler for unmatched API routes
 * Returns a JSON 404 response for any API endpoint that doesn't exist
 */
export const handler: Handlers = {
  GET(_req) {
    return createNotFoundResponse("API endpoint not found");
  },
  POST(_req) {
    return createNotFoundResponse("API endpoint not found");
  },
  PUT(_req) {
    return createNotFoundResponse("API endpoint not found");
  },
  PATCH(_req) {
    return createNotFoundResponse("API endpoint not found");
  },
  DELETE(_req) {
    return createNotFoundResponse("API endpoint not found");
  },
};
