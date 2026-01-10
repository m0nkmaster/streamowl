/**
 * JWT signing and verification utilities
 *
 * Provides functions for creating and validating JWT tokens for session management.
 * Uses HS256 algorithm for signing tokens.
 */

import {
  create,
  getNumericDate,
  verify,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts";

/**
 * Get JWT secret from environment variable
 * Falls back to a default for development (should be overridden in production)
 */
function getJwtSecret(): string {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is not set. Please set it in your .env file or environment.",
    );
  }
  return secret;
}

/**
 * Session payload structure
 */
export interface SessionPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Create a JWT token for a user session
 *
 * @param userId User ID (UUID)
 * @param email User email address
 * @param expiresInSeconds Token expiration time in seconds (default: 7 days)
 * @returns Signed JWT token string
 */
export async function createSessionToken(
  userId: string,
  email: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60, // 7 days default
): Promise<string> {
  const secret = getJwtSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const payload = {
    userId,
    email,
    exp: getNumericDate(new Date(Date.now() + expiresInSeconds * 1000)),
    iat: getNumericDate(new Date()),
  };

  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

/**
 * Verify and decode a JWT token
 *
 * @param token JWT token string
 * @returns Decoded session payload if valid
 * @throws Error if token is invalid, expired, or malformed
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload> {
  const secret = getJwtSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  try {
    const payload = await verify(token, key) as unknown;
    // Verify payload structure
    if (
      typeof payload === "object" &&
      payload !== null &&
      "userId" in payload &&
      "email" in payload &&
      typeof (payload as { userId: unknown }).userId === "string" &&
      typeof (payload as { email: unknown }).email === "string"
    ) {
      return payload as SessionPayload;
    }
    throw new Error("Invalid token payload structure");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid or expired token: ${message}`);
  }
}
