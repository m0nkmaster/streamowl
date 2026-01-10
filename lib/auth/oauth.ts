/**
 * Google OAuth configuration and utilities
 *
 * Provides functions for initiating and handling Google OAuth flows.
 */

/**
 * Get Google OAuth client ID from environment variable
 */
export function getGoogleClientId(): string {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientId) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID environment variable is not set. Please set it in your .env file.",
    );
  }
  return clientId;
}

/**
 * Get Google OAuth client secret from environment variable
 */
export function getGoogleClientSecret(): string {
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_SECRET environment variable is not set. Please set it in your .env file.",
    );
  }
  return clientSecret;
}

/**
 * Get the OAuth redirect URI based on the current request
 */
export function getRedirectUri(req: Request): string {
  const url = new URL(req.url);
  const origin = url.origin;
  return `${origin}/api/auth/google/callback`;
}

/**
 * Generate Google OAuth authorization URL
 *
 * @param req Request object to determine redirect URI
 * @param state Optional state parameter for CSRF protection
 * @returns Google OAuth authorization URL
 */
export function getGoogleAuthUrl(req: Request, state?: string): string {
  const clientId = getGoogleClientId();
  const redirectUri = getRedirectUri(req);
  const scope = "openid email profile";
  const responseType = "code";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    scope: scope,
    access_type: "offline",
    prompt: "consent",
  });

  if (state) {
    params.set("state", state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 *
 * @param code Authorization code from Google
 * @param req Request object to determine redirect URI
 * @returns Access token and refresh token
 */
export async function exchangeCodeForToken(
  code: string,
  req: Request,
): Promise<{ access_token: string; refresh_token?: string }> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getRedirectUri(req);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to exchange code for token: ${response.status} ${errorText}`,
    );
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token?: string;
  };

  return data;
}

/**
 * Get user profile information from Google
 *
 * @param accessToken Google OAuth access token
 * @returns User profile information
 */
export async function getGoogleUserProfile(accessToken: string): Promise<{
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  picture?: string;
}> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch user profile: ${response.status} ${errorText}`,
    );
  }

  return await response.json() as {
    id: string;
    email: string;
    verified_email: boolean;
    name?: string;
    picture?: string;
  };
}
