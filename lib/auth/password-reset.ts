/**
 * Password reset token utilities
 *
 * Provides functions for generating, storing, and validating password reset tokens
 */

import { query } from "../db.ts";

/**
 * Generate a cryptographically secure random token for password reset
 *
 * @returns Random token string (32 bytes, base64 encoded, URL-safe)
 */
export function generatePasswordResetToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Create a password reset token for a user
 *
 * @param userId User ID (UUID)
 * @param expiresInHours Token expiration time in hours (default: 24 hours)
 * @returns Password reset token string
 */
export async function createPasswordResetToken(
  userId: string,
  expiresInHours: number = 24,
): Promise<string> {
  const token = generatePasswordResetToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt.toISOString()],
  );

  return token;
}

/**
 * Validate a password reset token
 *
 * @param token Password reset token string
 * @returns User ID if token is valid, null otherwise
 */
export async function validatePasswordResetToken(
  token: string,
): Promise<string | null> {
  const tokens = await query<{
    user_id: string;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token = $1`,
    [token],
  );

  if (tokens.length === 0) {
    return null;
  }

  const resetToken = tokens[0];

  // Check if token has expired
  if (new Date() > new Date(resetToken.expires_at)) {
    return null;
  }

  // Check if token has already been used
  if (resetToken.used_at !== null) {
    return null;
  }

  return resetToken.user_id;
}

/**
 * Mark a password reset token as used
 *
 * @param token Password reset token string
 */
export async function markPasswordResetTokenAsUsed(
  token: string,
): Promise<void> {
  await query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE token = $1`,
    [token],
  );
}

/**
 * Invalidate all password reset tokens for a user
 * Useful when password is successfully reset
 *
 * @param userId User ID (UUID)
 */
export async function invalidateUserPasswordResetTokens(
  userId: string,
): Promise<void> {
  await query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}
