/**
 * Email verification token utilities
 *
 * Provides functions for generating, storing, and validating email verification tokens
 */

import { query } from "../db.ts";

/**
 * Generate a cryptographically secure random token for email verification
 *
 * @returns Random token string (32 bytes, base64 encoded, URL-safe)
 */
export function generateEmailVerificationToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Create an email verification token for a user
 *
 * @param userId User ID (UUID)
 * @param expiresInHours Token expiration time in hours (default: 48 hours)
 * @returns Email verification token string
 */
export async function createEmailVerificationToken(
  userId: string,
  expiresInHours: number = 48,
): Promise<string> {
  const token = generateEmailVerificationToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt.toISOString()],
  );

  return token;
}

/**
 * Validate an email verification token
 *
 * @param token Email verification token string
 * @returns User ID if token is valid, null otherwise
 */
export async function validateEmailVerificationToken(
  token: string,
): Promise<string | null> {
  const tokens = await query<{
    user_id: string;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT user_id, expires_at, used_at
     FROM email_verification_tokens
     WHERE token = $1`,
    [token],
  );

  if (tokens.length === 0) {
    return null;
  }

  const verificationToken = tokens[0];

  // Check if token has expired
  if (new Date() > new Date(verificationToken.expires_at)) {
    return null;
  }

  // Check if token has already been used
  if (verificationToken.used_at !== null) {
    return null;
  }

  return verificationToken.user_id;
}

/**
 * Mark an email verification token as used and verify the user's email
 *
 * @param token Email verification token string
 * @returns true if successfully verified, false otherwise
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const userId = await validateEmailVerificationToken(token);

  if (!userId) {
    return false;
  }

  // Mark token as used
  await query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE token = $1`,
    [token],
  );

  // Update user's email_verified_at timestamp
  await query(
    `UPDATE users
     SET email_verified_at = NOW()
     WHERE id = $1`,
    [userId],
  );

  return true;
}

/**
 * Invalidate all email verification tokens for a user
 * Useful when email is successfully verified or user requests a new token
 *
 * @param userId User ID (UUID)
 */
export async function invalidateUserEmailVerificationTokens(
  userId: string,
): Promise<void> {
  await query(
    `UPDATE email_verification_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}

/**
 * Check if a user's email is verified
 *
 * @param userId User ID (UUID)
 * @returns true if email is verified, false otherwise
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const users = await query<{ email_verified_at: Date | null }>(
    `SELECT email_verified_at FROM users WHERE id = $1`,
    [userId],
  );

  if (users.length === 0) {
    return false;
  }

  return users[0].email_verified_at !== null;
}

/**
 * Resend email verification by creating a new token
 * Invalidates any existing tokens for the user
 *
 * @param userId User ID (UUID)
 * @returns New email verification token string
 */
export async function resendEmailVerification(userId: string): Promise<string> {
  // Invalidate existing tokens
  await invalidateUserEmailVerificationTokens(userId);

  // Create new token
  return await createEmailVerificationToken(userId);
}
