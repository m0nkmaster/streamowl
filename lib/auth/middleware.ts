/**
 * Authentication middleware for extracting and validating sessions
 *
 * Provides middleware functions to extract session tokens from requests,
 * validate them, and make session data available to route handlers.
 */

import type { HandlerContext } from "$fresh/server.ts";
import { getSessionToken } from "./cookies.ts";
import { type SessionPayload, verifySessionToken } from "./jwt.ts";

/**
 * Session data attached to Fresh context
 */
export interface SessionContext {
  session: SessionPayload | null;
  isAuthenticated: boolean;
}

/**
 * Extract and validate session from request
 *
 * @param request Request object
 * @returns Session payload if valid token found, null otherwise
 */
export async function getSessionFromRequest(
  request: Request,
): Promise<SessionPayload | null> {
  const token = getSessionToken(request);
  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Middleware function to attach session to Fresh handler context
 *
 * Usage in route handlers:
 * ```ts
 * export const handler: Handlers = {
 *   async GET(req, ctx) {
 *     const session = ctx.state.session;
 *     if (!session) {
 *       return new Response("Unauthorized", { status: 401 });
 *     }
 *     // Use session.userId, session.email
 *   }
 * }
 * ```
 */
export async function withSession(
  req: Request,
  ctx: HandlerContext,
): Promise<HandlerContext & { state: SessionContext }> {
  const session = await getSessionFromRequest(req);

  return {
    ...ctx,
    state: {
      ...ctx.state,
      session,
      isAuthenticated: session !== null,
    },
  };
}

/**
 * Helper to require authentication in route handlers
 *
 * @param ctx Handler context with session state
 * @returns Session payload if authenticated
 * @throws Response with 401 status if not authenticated
 */
export function requireAuth(
  ctx: HandlerContext & { state: SessionContext },
): SessionPayload {
  if (!ctx.state.session || !ctx.state.isAuthenticated) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return ctx.state.session;
}
