/**
 * Unit tests for password hashing and verification utilities
 */

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import { hashPassword, verifyPassword } from "./password.ts";

Deno.test("hashPassword should create a bcrypt hash", async () => {
  const password = "testPassword123";
  const hash = await hashPassword(password);

  // Bcrypt hashes start with $2a$, $2b$, or $2y$
  assert(hash.startsWith("$2"));
  // Hash should be different from password
  assert(hash !== password);
  // Hash should be a reasonable length (bcrypt hashes are ~60 chars)
  assert(hash.length > 50);
});

Deno.test("hashPassword should create different hashes for same password", async () => {
  const password = "testPassword123";
  const hash1 = await hashPassword(password);
  const hash2 = await hashPassword(password);

  // Each hash should be unique due to salt
  assert(hash1 !== hash2);
});

Deno.test("verifyPassword should return true for correct password", async () => {
  const password = "testPassword123";
  const hash = await hashPassword(password);

  const isValid = await verifyPassword(password, hash);
  assertEquals(isValid, true);
});

Deno.test("verifyPassword should return false for incorrect password", async () => {
  const password = "testPassword123";
  const wrongPassword = "wrongPassword456";
  const hash = await hashPassword(password);

  const isValid = await verifyPassword(wrongPassword, hash);
  assertEquals(isValid, false);
});

Deno.test("verifyPassword should handle empty password", async () => {
  const password = "";
  const hash = await hashPassword(password);

  const isValid = await verifyPassword(password, hash);
  assertEquals(isValid, true);
});

Deno.test("verifyPassword should handle special characters in password", async () => {
  const password = "p@ssw0rd!@#$%^&*()";
  const hash = await hashPassword(password);

  const isValid = await verifyPassword(password, hash);
  assertEquals(isValid, true);
});

Deno.test("verifyPassword should handle long password", async () => {
  const password = "a".repeat(100);
  const hash = await hashPassword(password);

  const isValid = await verifyPassword(password, hash);
  assertEquals(isValid, true);
});
