/**
 * Rate limiting utilities for AI recommendations
 *
 * Tracks daily recommendation usage for free tier users
 * Limits free users to 3 AI recommendations per day
 */

import { redisCache } from "../cache/redis.ts";
import { isPremiumUser } from "../auth/premium.ts";

/**
 * Get daily usage key for a user
 * Key format: recommendation_usage:{userId}:{date}
 */
function getDailyUsageKey(userId: string): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  return `recommendation_usage:${userId}:${today}`;
}

/**
 * Calculate seconds until midnight (when limit resets)
 */
function getSecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

/**
 * Get current recommendation usage count for a user today
 */
export async function getRecommendationUsage(userId: string): Promise<number> {
  // Premium users have unlimited recommendations
  const isPremium = await isPremiumUser(userId);
  if (isPremium) {
    return 0; // No limit for premium users
  }

  const key = getDailyUsageKey(userId);
  return await redisCache.getInt(key);
}

/**
 * Increment recommendation usage for a user
 * Returns the new count after increment
 */
export async function incrementRecommendationUsage(
  userId: string,
): Promise<number> {
  // Premium users have unlimited recommendations
  const isPremium = await isPremiumUser(userId);
  if (isPremium) {
    return 0; // No limit for premium users
  }

  const key = getDailyUsageKey(userId);
  const ttlSeconds = getSecondsUntilMidnight();
  return await redisCache.increment(key, ttlSeconds);
}

/**
 * Check if user has reached their daily recommendation limit
 * Returns true if limit reached, false otherwise
 */
export async function hasReachedRecommendationLimit(
  userId: string,
): Promise<boolean> {
  // Premium users have unlimited recommendations
  const isPremium = await isPremiumUser(userId);
  if (isPremium) {
    return false; // No limit for premium users
  }

  const usage = await getRecommendationUsage(userId);
  return usage >= 3; // Free tier limit: 3 recommendations per day
}

/**
 * Get remaining recommendations for a user today
 * Returns 0 for premium users (unlimited)
 */
export async function getRemainingRecommendations(
  userId: string,
): Promise<number> {
  // Premium users have unlimited recommendations
  const isPremium = await isPremiumUser(userId);
  if (isPremium) {
    return 999; // Return a high number for premium users
  }

  const usage = await getRecommendationUsage(userId);
  return Math.max(0, 3 - usage); // Free tier limit: 3 recommendations per day
}
