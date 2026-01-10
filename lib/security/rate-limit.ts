/**
 * Rate limiting utilities for authentication endpoints
 *
 * Implements rate limiting to prevent brute force attacks on login and signup endpoints.
 * Uses a sliding window approach to track failed attempts per identifier (IP address or email).
 */

// Rate limit configuration: 10 failed attempts per 15 minutes
const MAX_FAILED_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Rate limit entry tracking failed attempts
 */
interface RateLimitEntry {
  attempts: number[];
  blockedUntil: number | null;
}

/**
 * In-memory store for rate limit entries
 * Key: identifier (IP address or email)
 * Value: RateLimitEntry with attempt timestamps
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up old entries periodically to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries that are no longer blocked and have no recent attempts
    if (
      (!entry.blockedUntil || entry.blockedUntil < now) &&
      entry.attempts.length === 0
    ) {
      rateLimitStore.delete(key);
    } else {
      // Clean up old attempts outside the window
      const windowStart = now - RATE_LIMIT_WINDOW_MS;
      entry.attempts = entry.attempts.filter((time) => time > windowStart);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string {
  // Check X-Forwarded-For header (for proxies/load balancers)
  const forwardedFor = req.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  // Check X-Real-IP header (alternative proxy header)
  const realIp = req.headers.get("X-Real-IP");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback: use a default identifier if IP cannot be determined
  // In production, this should never happen, but we need a fallback
  return "unknown";
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier Unique identifier (IP address or email)
 * @returns Object with isBlocked flag and remaining time in seconds if blocked
 */
export function checkRateLimit(
  identifier: string,
): { isBlocked: boolean; remainingSeconds: number | null } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous attempts, allow request
  if (!entry) {
    return { isBlocked: false, remainingSeconds: null };
  }

  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return { isBlocked: true, remainingSeconds };
  }

  // Clean up old attempts outside the window
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  entry.attempts = entry.attempts.filter((time) => time > windowStart);

  // Check if limit exceeded
  if (entry.attempts.length >= MAX_FAILED_ATTEMPTS) {
    // Block for the remaining window time
    const oldestAttempt = Math.min(...entry.attempts);
    const blockUntil = oldestAttempt + RATE_LIMIT_WINDOW_MS;
    entry.blockedUntil = blockUntil;
    const remainingSeconds = Math.ceil((blockUntil - now) / 1000);
    return { isBlocked: true, remainingSeconds };
  }

  // Not blocked, clear any previous block
  entry.blockedUntil = null;
  return { isBlocked: false, remainingSeconds: null };
}

/**
 * Record a failed authentication attempt
 *
 * @param identifier Unique identifier (IP address or email)
 */
export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);

  if (!entry) {
    entry = { attempts: [], blockedUntil: null };
    rateLimitStore.set(identifier, entry);
  }

  // Add current timestamp to attempts
  entry.attempts.push(now);

  // Clean up old attempts outside the window
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  entry.attempts = entry.attempts.filter((time) => time > windowStart);

  // Check if limit exceeded and set block
  if (entry.attempts.length >= MAX_FAILED_ATTEMPTS) {
    const oldestAttempt = Math.min(...entry.attempts);
    entry.blockedUntil = oldestAttempt + RATE_LIMIT_WINDOW_MS;
  }
}

/**
 * Clear failed attempts for an identifier (e.g., after successful login)
 *
 * @param identifier Unique identifier (IP address or email)
 */
export function clearFailedAttempts(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get rate limit status for an identifier
 *
 * @param identifier Unique identifier (IP address or email)
 * @returns Object with attempt count and remaining time
 */
export function getRateLimitStatus(identifier: string): {
  attemptCount: number;
  remainingSeconds: number | null;
} {
  const entry = rateLimitStore.get(identifier);
  if (!entry) {
    return { attemptCount: 0, remainingSeconds: null };
  }

  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentAttempts = entry.attempts.filter((time) => time > windowStart);

  let remainingSeconds: number | null = null;
  if (entry.blockedUntil && entry.blockedUntil > now) {
    remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
  }

  return {
    attemptCount: recentAttempts.length,
    remainingSeconds,
  };
}
