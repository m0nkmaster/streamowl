/**
 * Redis/Upstash cache module for TMDB API responses
 *
 * Provides a Redis cache client using Upstash Redis REST API.
 * Falls back gracefully if Redis is not configured.
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Redis cache client wrapper
 */
class RedisCache {
  private redisUrl: string | null = null;
  private redisToken: string | null = null;
  private enabled: boolean = false;

  constructor() {
    this.redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL") || null;
    this.redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN") || null;
    this.enabled = !!(this.redisUrl && this.redisToken);
  }

  /**
   * Check if Redis cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate cache key from endpoint and parameters
   */
  private generateCacheKey(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
  ): string {
    const keyParts = [`tmdb:${endpoint}`];
    if (params) {
      const sortedParams = Object.keys(params).sort().map((key) => {
        return `${key}=${params[key]}`;
      });
      keyParts.push(...sortedParams);
    }
    return keyParts.join(":");
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      // Upstash REST API format: POST with command array
      const response = await fetch(`${this.redisUrl}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["GET", key]),
      });

      if (!response.ok) {
        // If Redis is unavailable, log and return null (graceful degradation)
        console.warn(`Redis cache get failed: ${response.status}`);
        return null;
      }

      const result = await response.json();
      if (!result.result) {
        return null;
      }

      const entry = JSON.parse(result.result) as CacheEntry<T>;
      const now = Date.now();

      // Check if entry has expired
      if (entry.expiresAt < now) {
        // Entry expired, delete it
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      // Graceful degradation: if Redis fails, continue without cache
      console.warn(
        `Redis cache error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const expiresAt = Date.now() + (ttlSeconds * 1000);
      const entry: CacheEntry<T> = {
        data: value,
        expiresAt,
      };

      // Upstash REST API format: POST with SETEX command
      // SETEX key seconds value
      const response = await fetch(`${this.redisUrl}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          "SETEX",
          key,
          ttlSeconds.toString(),
          JSON.stringify(entry),
        ]),
      });

      if (!response.ok) {
        console.warn(`Redis cache set failed: ${response.status}`);
      }
    } catch (error) {
      // Graceful degradation: if Redis fails, continue without cache
      console.warn(
        `Redis cache error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Upstash REST API format: POST with DEL command
      await fetch(`${this.redisUrl}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["DEL", key]),
      });
    } catch (error) {
      // Ignore errors on delete
      console.warn(
        `Redis cache delete error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Get cached value using endpoint and params
   */
  async getCached<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<T | null> {
    const key = this.generateCacheKey(endpoint, params);
    return await this.get<T>(key);
  }

  /**
   * Set cached value using endpoint and params
   */
  async setCached<T>(
    endpoint: string,
    params: Record<string, string | number | boolean> | undefined,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.generateCacheKey(endpoint, params);
    await this.set(key, value, ttlSeconds);
  }
}

// Singleton cache instance
export const redisCache = new RedisCache();
