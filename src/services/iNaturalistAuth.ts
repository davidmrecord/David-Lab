import * as AuthSession from 'expo-auth-session';
import { getSetting, setSetting } from '../db/database';

// ---------------------------------------------------------------------------
// iNaturalist OAuth — Authorization Code Flow
//
// One-time setup:
//   1. Go to https://www.inaturalist.org/oauth/applications and create an app.
//   2. Set the redirect URI to: https://auth.expo.io/@davidmrecord/fishing-journal
//   3. Paste your client_id and client_secret below.
//
// After that the user signs in once (Google works on iNaturalist's page) and
// the app auto-refreshes the 24-hour API JWT forever using the stored
// OAuth access token — no more manual token pasting.
// ---------------------------------------------------------------------------

export const CLIENT_ID = 'YOUR_CLIENT_ID';       // ← paste from iNaturalist
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';       // ← paste from iNaturalist

const AUTHORIZE_URL = 'https://www.inaturalist.org/oauth/authorize';
const TOKEN_URL = 'https://www.inaturalist.org/oauth/token';
const API_JWT_URL = 'https://www.inaturalist.org/users/api_token';

// Stable redirect URI — register exactly this string in your iNaturalist OAuth app.
export const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'fishingjournal',
  path: 'oauth',
  preferLocalhost: false,
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Decode the `exp` claim from a JWT without verifying the signature. */
function jwtExpiry(jwt: string): Date | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json);
    return typeof exp === 'number' ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}

/** POST an auth code to iNaturalist and return the raw access_token string. */
async function exchangeCode(code: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: [
      `client_id=${encodeURIComponent(CLIENT_ID)}`,
      `client_secret=${encodeURIComponent(CLIENT_SECRET)}`,
      `code=${encodeURIComponent(code)}`,
      `grant_type=authorization_code`,
      `redirect_uri=${encodeURIComponent(redirectUri)}`,
    ].join('&'),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  const data = await res.json();
  if (!data.access_token) throw new Error('No access_token in response');
  return data.access_token;
}

/** Fetch a fresh 24-hour API JWT using the stored OAuth access token. */
async function fetchFreshJwt(accessToken: string): Promise<string> {
  const res = await fetch(API_JWT_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`JWT refresh failed (${res.status})`);
  const data = await res.json();
  if (!data.api_token) throw new Error('No api_token in response');
  return data.api_token;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Exchange an OAuth authorization code for an access token and persist it.
 * Called by SettingsScreen after the browser redirect returns a code.
 */
export async function exchangeAndStoreToken(code: string): Promise<void> {
  const accessToken = await exchangeCode(code);
  await setSetting('inat_oauth_token', accessToken);
  // Pre-warm the JWT cache so fish ID works immediately.
  const jwt = await fetchFreshJwt(accessToken);
  await setSetting('inat_api_jwt', jwt);
}

/**
 * Returns a valid iNaturalist API JWT.
 *
 * - If the cached JWT is still valid, returns it immediately.
 * - If expired, silently fetches a new one using the stored OAuth access token.
 * - If no access token is stored (user hasn't signed in), returns null.
 */
export async function getApiToken(): Promise<string | null> {
  const jwt = await getSetting('inat_api_jwt');
  if (jwt) {
    const expiry = jwtExpiry(jwt);
    if (!expiry || expiry > new Date()) return jwt;
  }

  // JWT missing or expired — refresh silently.
  const accessToken = await getSetting('inat_oauth_token');
  if (!accessToken) return null;

  try {
    const fresh = await fetchFreshJwt(accessToken);
    await setSetting('inat_api_jwt', fresh);
    return fresh;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  await setSetting('inat_oauth_token', '');
  await setSetting('inat_api_jwt', '');
}

/** Returns true if the user has completed the OAuth sign-in flow. */
export async function isSignedIn(): Promise<boolean> {
  const token = await getSetting('inat_oauth_token');
  return !!token;
}

// Expose the authorization endpoint so the settings screen can pass it to
// useAuthRequest without importing a raw URL string.
export const INAT_AUTHORIZATION_ENDPOINT = AUTHORIZE_URL;
