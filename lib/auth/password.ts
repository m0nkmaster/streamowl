/**
 * Password hashing and verification utilities
 *
 * Provides functions for securely hashing passwords using bcrypt
 * and verifying passwords against stored hashes.
 */

import { compare, hash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

/**
 * Hash a password using bcrypt
 *
 * @param password Plain text password
 * @returns Bcrypt hash string
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

/**
 * Verify a password against a bcrypt hash
 *
 * @param password Plain text password to verify
 * @param hash Bcrypt hash to compare against
 * @returns true if password matches hash, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await compare(password, hash);
}
