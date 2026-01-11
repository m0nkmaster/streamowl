#!/usr/bin/env -S deno run -A
/**
 * VAPID Key Generation Script
 *
 * Generates VAPID (Voluntary Application Server Identification) keys
 * for Web Push notifications.
 *
 * Usage:
 *   deno run -A scripts/generate-vapid-keys.ts
 *
 * The output can be copied to your .env file.
 */

import { generateVapidKeys } from "../lib/notifications/push.ts";

async function main() {
  console.log("Generating VAPID keys for Web Push notifications...\n");

  try {
    const keys = await generateVapidKeys();

    console.log("=".repeat(60));
    console.log("VAPID Keys Generated Successfully");
    console.log("=".repeat(60));
    console.log("\nAdd these to your .env file:\n");
    console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
    console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
    console.log("\n" + "=".repeat(60));
    console.log("\nNote: Keep your private key secret!");
    console.log(
      "The public key is shared with browsers for push subscriptions.",
    );
  } catch (error) {
    console.error("Failed to generate VAPID keys:", error);
    Deno.exit(1);
  }
}

main();
