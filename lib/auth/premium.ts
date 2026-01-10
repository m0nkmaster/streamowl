/**
 * Premium status utilities
 *
 * Provides shared functions for checking user premium status
 * Premium status is stored in user preferences as preferences.premium = true
 */

import { query } from "../db.ts";

/**
 * Check if a user has premium status
 * @param userId - The user ID to check
 * @returns true if user has premium, false otherwise
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const result = await query<{ preferences: Record<string, unknown> }>(
    "SELECT preferences FROM users WHERE id = $1",
    [userId],
  );

  if (result.length === 0) {
    return false;
  }

  const preferences = result[0].preferences || {};
  return preferences.premium === true;
}
