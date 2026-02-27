import { getSetting, setSetting } from '../db/database';

// ---------------------------------------------------------------------------
// iNaturalist personal API token
//
// How to get your token (no app registration needed):
//   1. Log in at https://www.inaturalist.org
//   2. Visit https://www.inaturalist.org/users/api_token
//   3. Copy the token and paste it into Settings → Fish ID
//
// Tokens are valid for 24 hours; return here to refresh when fish ID stops
// working.
// ---------------------------------------------------------------------------

/** Decode the `exp` claim from a JWT without verifying the signature. */
function jwtExpiry(jwt: string): Date | null {
  try {
    const payloadB64 = jwt.split('.')[1];
    if (!payloadB64) return null;
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json);
    return typeof exp === 'number' ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function saveToken(jwt: string): Promise<void> {
  const trimmed = jwt.trim();
  if (!trimmed) throw new Error('Token is empty.');
  if (trimmed.split('.').length !== 3) throw new Error('Does not look like a valid JWT.');
  await setSetting('inat_api_jwt', trimmed);
}

/** Returns the stored JWT if present and not yet expired, otherwise null. */
export async function getApiToken(): Promise<string | null> {
  const jwt = await getSetting('inat_api_jwt');
  if (!jwt) return null;

  const expiry = jwtExpiry(jwt);
  if (expiry && expiry <= new Date()) return null; // expired

  return jwt;
}

/** Returns { saved, expired } so the UI can show appropriate state. */
export async function getTokenStatus(): Promise<{ saved: boolean; expired: boolean }> {
  const jwt = await getSetting('inat_api_jwt');
  if (!jwt) return { saved: false, expired: false };

  const expiry = jwtExpiry(jwt);
  const expired = expiry ? expiry <= new Date() : false;
  return { saved: true, expired };
}

export async function clearToken(): Promise<void> {
  await setSetting('inat_api_jwt', '');
}
