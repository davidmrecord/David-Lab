import { getSetting, setSetting } from '../db/database';

// ---------------------------------------------------------------------------
// iNaturalist OAuth credentials
// Register your app at: https://www.inaturalist.org/oauth/applications
// Then replace these placeholder values.
// ---------------------------------------------------------------------------
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';

const OAUTH_TOKEN_URL = 'https://www.inaturalist.org/oauth/token';
const API_JWT_URL = 'https://www.inaturalist.org/users/api_token';

// ---------------------------------------------------------------------------
// Login — Resource Owner Password Credentials flow
// ---------------------------------------------------------------------------
export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<void> {
  // Step 1: exchange credentials for OAuth access token
  const tokenRes = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: [
      `client_id=${encodeURIComponent(CLIENT_ID)}`,
      `client_secret=${encodeURIComponent(CLIENT_SECRET)}`,
      `grant_type=password`,
      `username=${encodeURIComponent(username)}`,
      `password=${encodeURIComponent(password)}`,
    ].join('&'),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => '');
    throw new Error(`Login failed (${tokenRes.status}): ${body}`);
  }

  const { access_token } = await tokenRes.json();

  // Step 2: exchange OAuth token for API JWT (valid 24 h)
  const jwt = await fetchApiJwt(access_token);

  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();

  await setSetting('inat_access_token', access_token);
  await setSetting('inat_api_jwt', jwt);
  await setSetting('inat_jwt_expires_at', expiresAt);
  await setSetting('inat_username', username);
}

// ---------------------------------------------------------------------------
// Get a valid API JWT, refreshing if expired
// ---------------------------------------------------------------------------
export async function getApiToken(): Promise<string | null> {
  const jwt = await getSetting('inat_api_jwt');
  if (!jwt) return null;

  const expiresAt = await getSetting('inat_jwt_expires_at');
  const expired = expiresAt ? new Date(expiresAt) <= new Date() : true;

  if (!expired) return jwt;

  // Refresh using stored OAuth access token
  const accessToken = await getSetting('inat_access_token');
  if (!accessToken) return null;

  try {
    const newJwt = await fetchApiJwt(accessToken);
    const newExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    await setSetting('inat_api_jwt', newJwt);
    await setSetting('inat_jwt_expires_at', newExpiry);
    return newJwt;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------
export async function getConnectedUsername(): Promise<string | null> {
  const username = await getSetting('inat_username');
  return username || null;
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
export async function logout(): Promise<void> {
  await setSetting('inat_access_token', '');
  await setSetting('inat_api_jwt', '');
  await setSetting('inat_jwt_expires_at', '');
  await setSetting('inat_username', '');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
async function fetchApiJwt(accessToken: string): Promise<string> {
  const res = await fetch(API_JWT_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'FishingJournal/1 (mobile app)',
    },
  });
  if (!res.ok) throw new Error(`JWT exchange failed: ${res.status}`);
  const { api_token } = await res.json();
  return api_token;
}
