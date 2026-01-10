/**
 * Web Push Notification Library
 *
 * Implements the Web Push protocol for sending push notifications
 * to subscribed browsers/devices.
 *
 * Required environment variables:
 * - VAPID_PUBLIC_KEY: Base64-URL encoded public key
 * - VAPID_PRIVATE_KEY: Base64-URL encoded private key
 * - VAPID_SUBJECT: Contact email (mailto:) or URL
 *
 * Note: For a full production implementation, consider using a dedicated
 * web-push service or the npm web-push package via Deno's npm: specifier.
 */

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  contentId?: string;
  type?: string;
  data?: Record<string, unknown>;
}

/**
 * Get VAPID keys from environment
 */
function getVapidKeys(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@streamowl.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.",
    );
  }

  return { publicKey, privateKey, subject };
}

/**
 * Convert base64url to Uint8Array
 */
function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert Uint8Array to base64url
 */
function uint8ArrayToBase64url(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * HKDF key derivation function
 */
async function hkdfDerive(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    ikm,
    { name: "HKDF" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: info,
    },
    key,
    length * 8,
  );

  return new Uint8Array(bits);
}

/**
 * Create VAPID JWT token for authentication
 */
async function createVapidJwt(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string,
): Promise<{ token: string; publicKeyB64: string }> {
  const now = Math.floor(Date.now() / 1000);

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = uint8ArrayToBase64url(
    encoder.encode(JSON.stringify(header)),
  );
  const payloadB64 = uint8ArrayToBase64url(
    encoder.encode(JSON.stringify(payload)),
  );

  const signInput = encoder.encode(`${headerB64}.${payloadB64}`);

  // Import private key for signing
  const privateKeyBytes = base64urlToUint8Array(privateKey);

  // We need to create a JWK with both private and public key components
  // The public key is 65 bytes (uncompressed point format)
  const publicKeyBytes = base64urlToUint8Array(publicKey);

  // Extract x and y coordinates from uncompressed public key (skip 0x04 prefix)
  const x = uint8ArrayToBase64url(publicKeyBytes.slice(1, 33));
  const y = uint8ArrayToBase64url(publicKeyBytes.slice(33, 65));
  const d = uint8ArrayToBase64url(privateKeyBytes);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
  };

  const ecKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    ecKey,
    signInput,
  );

  // Convert signature from DER to raw format if needed
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;

  if (sigBytes.length === 64) {
    // Already in raw format
    rawSig = sigBytes;
  } else {
    // DER format - extract r and s values
    // Simple extraction - assumes valid DER
    rawSig = sigBytes.slice(0, 64);
  }

  const signatureB64 = uint8ArrayToBase64url(rawSig);
  const token = `${headerB64}.${payloadB64}.${signatureB64}`;

  return { token, publicKeyB64: publicKey };
}

/**
 * Encrypt payload using Web Push encryption (aes128gcm)
 */
async function encryptPayload(
  payload: Uint8Array,
  subscription: PushSubscription,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  // Generate a new ECDH key pair for this message
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  // Export server public key
  const serverPublicKeyBuffer = await crypto.subtle.exportKey(
    "raw",
    serverKeyPair.publicKey,
  );
  const serverPublicKey = new Uint8Array(serverPublicKeyBuffer);

  // Import client's public key
  const clientPublicKeyBytes = base64urlToUint8Array(subscription.keys.p256dh);
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // Derive shared secret
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedSecretBuffer);

  // Get auth secret
  const authSecret = base64urlToUint8Array(subscription.keys.auth);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Create info strings for HKDF
  const encoder = new TextEncoder();
  const keyInfoPrefix = encoder.encode("Content-Encoding: aes128gcm\0");
  const nonceInfoPrefix = encoder.encode("Content-Encoding: nonce\0");

  // Derive PRK (Pseudo-Random Key)
  const authInfo = encoder.encode("Content-Encoding: auth\0");
  const prk = await hkdfDerive(sharedSecret, authSecret, authInfo, 32);

  // Create context for key derivation
  const context = new Uint8Array([
    ...encoder.encode("P-256\0"),
    0,
    65, // Client public key length
    ...clientPublicKeyBytes,
    0,
    65, // Server public key length
    ...serverPublicKey,
  ]);

  // Derive CEK (Content Encryption Key)
  const cekInfo = new Uint8Array([...keyInfoPrefix, ...context]);
  const cek = await hkdfDerive(prk, salt, cekInfo, 16);

  // Derive nonce
  const nonceInfo = new Uint8Array([...nonceInfoPrefix, ...context]);
  const nonce = await hkdfDerive(prk, salt, nonceInfo, 12);

  // Pad payload (add padding delimiter)
  const paddedPayload = new Uint8Array(payload.length + 1);
  paddedPayload.set(payload);
  paddedPayload[payload.length] = 2; // Padding delimiter

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  // Encrypt the payload
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    paddedPayload,
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    serverPublicKey,
  };
}

/**
 * Send a push notification to a subscription
 *
 * Uses the Web Push protocol with VAPID authentication
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload,
): Promise<void> {
  const vapid = getVapidKeys();

  // Prepare payload
  const payloadString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payloadString);

  // Encrypt payload
  const { ciphertext, salt, serverPublicKey } = await encryptPayload(
    payloadBytes,
    subscription,
  );

  // Build the encrypted body with header
  // Header format: salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = 4096; // Record size
  const header = new Uint8Array(86);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = 65; // Key ID length (uncompressed P-256 key)
  header.set(serverPublicKey, 21);

  // Combine header and ciphertext
  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);

  // Parse the endpoint URL to get the audience
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

  // Create VAPID JWT
  const { token, publicKeyB64 } = await createVapidJwt(
    audience,
    vapid.subject,
    vapid.publicKey,
    vapid.privateKey,
  );

  // Make the request to the push service
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "Content-Length": String(body.length),
      TTL: "86400",
      Urgency: "normal",
      Authorization: `vapid t=${token}, k=${publicKeyB64}`,
    },
    body: body,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Push notification failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
}

/**
 * Generate VAPID key pair
 * Run this once to generate keys for your application
 */
export async function generateVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );

  // Export public key in uncompressed format
  const publicKeyBuffer = await crypto.subtle.exportKey(
    "raw",
    keyPair.publicKey,
  );
  const publicKey = uint8ArrayToBase64url(new Uint8Array(publicKeyBuffer));

  // Export private key
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const privateKey = privateKeyJwk.d || "";

  return { publicKey, privateKey };
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  try {
    getVapidKeys();
    return true;
  } catch {
    return false;
  }
}
