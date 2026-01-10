/**
 * Database configuration module with connection pooling
 *
 * Uses PostgreSQL with connection pooling for efficient database access.
 * Connection pool is created from DATABASE_URL environment variable.
 */

import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { PoolClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

/**
 * Get database URL from environment variable
 * Falls back to a default local connection if not set
 */
function getDatabaseUrl(): string {
  const url = Deno.env.get("DATABASE_URL");
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please set it in your .env file or environment.",
    );
  }
  return url;
}

/**
 * Create a connection pool with sensible defaults
 *
 * Pool configuration:
 * - min: 2 connections (minimum pool size)
 * - max: 10 connections (maximum pool size)
 * - idleTimeoutMillis: 30000 (30 seconds before idle connection is closed)
 */
function createPool(): Pool {
  const databaseUrl = getDatabaseUrl();

  // Pool is configured with max 10 connections and lazy initialization
  return new Pool(databaseUrl, 10, true);
}

// Create singleton pool instance
let pool: Pool | null = null;

/**
 * Get the database connection pool
 * Creates pool on first access if it doesn't exist
 */
export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

/**
 * Execute a query using the connection pool
 *
 * **SECURITY: SQL Injection Prevention**
 * This function uses parameterised queries to prevent SQL injection attacks.
 * Always use $1, $2, etc. placeholders in the query string and pass values
 * in the params array. Never concatenate user input directly into SQL strings.
 *
 * ✅ CORRECT:
 * ```ts
 * await query("SELECT * FROM users WHERE email = $1", [userEmail]);
 * ```
 *
 * ❌ WRONG (vulnerable to SQL injection):
 * ```ts
 * await query(`SELECT * FROM users WHERE email = '${userEmail}'`);
 * ```
 *
 * @param query SQL query string with $1, $2, etc. placeholders
 * @param params Query parameters (for parameterised queries)
 * @returns Query result
 */
export async function query<T = unknown>(
  query: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.queryObject<T>({
      text: query,
      args: params,
    });
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool for transactions or multiple queries
 *
 * IMPORTANT: Always release the client when done using client.release()
 *
 * @returns Pool client
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Execute a transaction
 *
 * @param callback Function that receives a client and performs transaction operations
 * @returns Result of the callback function
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getClient();

  try {
    await client.queryObject("BEGIN");
    const result = await callback(client);
    await client.queryObject("COMMIT");
    return result;
  } catch (error) {
    await client.queryObject("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the database connection pool
 * Should be called during application shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test database connection
 *
 * @returns true if connection successful, throws error otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query<{ test: number }>("SELECT 1 as test");
    return result.length === 1 && result[0].test === 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Database connection test failed: ${message}`);
  }
}
