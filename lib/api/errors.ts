/**
 * Consistent error response utilities for API endpoints
 *
 * Provides standardised error response formats for:
 * - 400 Bad Request (validation errors)
 * - 401 Unauthorized
 * - 404 Not Found
 * - 500 Internal Server Error
 * - Other HTTP status codes
 */

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, string | string[]>;
  code?: string;
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  error: "Validation failed";
  details: Record<string, string | string[]>;
}

/**
 * Create a standardised error response
 */
export function createErrorResponse(
  status: number,
  error: string,
  message?: string,
  details?: Record<string, string | string[]>,
  code?: string,
): Response {
  const body: ApiErrorResponse = {
    error,
    ...(message && { message }),
    ...(details && { details }),
    ...(code && { code }),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create a 400 Bad Request response for validation errors
 */
export function createValidationErrorResponse(
  details: Record<string, string | string[]>,
  message: string = "Validation failed",
): Response {
  return createErrorResponse(400, "Validation failed", message, details);
}

/**
 * Create a 400 Bad Request response for a single validation error
 */
export function createBadRequestResponse(
  message: string,
  field?: string,
): Response {
  if (field) {
    return createValidationErrorResponse({ [field]: message });
  }
  return createErrorResponse(400, "Bad Request", message);
}

/**
 * Create a 401 Unauthorized response
 */
export function createUnauthorizedResponse(
  message: string = "Unauthorized",
): Response {
  return createErrorResponse(401, "Unauthorized", message);
}

/**
 * Create a 404 Not Found response
 */
export function createNotFoundResponse(
  message: string = "Resource not found",
): Response {
  return createErrorResponse(404, "Not Found", message);
}

/**
 * Create a 500 Internal Server Error response
 */
export function createInternalServerErrorResponse(
  message: string = "Internal server error",
  logError?: unknown,
): Response {
  if (logError) {
    const errorMessage = logError instanceof Error
      ? logError.message
      : String(logError);
    console.error("API error:", errorMessage);
  }
  return createErrorResponse(500, "Internal Server Error", message);
}

/**
 * Create a 403 Forbidden response
 */
export function createForbiddenResponse(
  message: string,
  code?: string,
): Response {
  return createErrorResponse(403, "Forbidden", message, undefined, code);
}

/**
 * Create a 429 Too Many Requests response
 */
export function createTooManyRequestsResponse(
  message: string,
  remainingSeconds?: number | null,
): Response {
  const body: ApiErrorResponse & {
    rateLimitExceeded?: boolean;
    remainingSeconds?: number;
  } = {
    error: "Too Many Requests",
    message,
    rateLimitExceeded: true,
    ...(remainingSeconds !== undefined && remainingSeconds !== null && {
      remainingSeconds,
    }),
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
}
