import type { WaterBodyType } from '../types';

const BASE = 'https://nominatim.openstreetmap.org';
const BASE_URL = `${BASE}/reverse`;
const HEADERS = {
  'User-Agent': 'FishingJournalApp/1.0 (personal mobile app, not for redistribution)',
};
// Rate limit: 1 req/sec — callers must enforce delay between requests

export interface LocationSearchResult {
  name: string | null;
  display_name: string;
  latitude: number;
  longitude: number;
  water_body_type: WaterBodyType;
}

export interface GeocodingResult {
  water_body: string | null;
  water_body_type: WaterBodyType;
  location_address: string | null; // Nominatim display_name (full human-readable address)
}

export function formatCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

function inferWaterBodyType(tags: Record<string, string>): WaterBodyType {
  const natural = tags.natural ?? '';
  const water = tags.water ?? '';
  const waterway = tags.waterway ?? '';

  if (waterway === 'river' || natural === 'river') return 'river';
  if (waterway === 'stream' || waterway === 'creek') return 'stream';
  if (water === 'reservoir') return 'reservoir';
  if (water === 'pond') return 'pond';
  if (natural === 'bay' || natural === 'strait' || tags.place === 'sea') return 'ocean';
  if (natural === 'water' || water === 'lake') return 'lake';
  if (waterway) return 'river'; // fallback for any waterway
  return 'unknown';
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult> {
  // Use device locale so Nominatim returns names in the user's language.
  const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    namedetails: '1',
    zoom: '14',
    'accept-language': deviceLocale,
  });

  const response = await fetch(`${BASE_URL}?${params}`, {
    headers: { ...HEADERS, 'Accept-Language': deviceLocale },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = await response.json();
  const name =
    data.namedetails?.name ??
    data.name ??
    data.address?.body_of_water ??
    data.address?.river ??
    data.address?.lake ??
    null;

  const tags: Record<string, string> = {
    natural: data.address?.natural ?? '',
    water: data.extratags?.water ?? '',
    waterway: data.address?.waterway ?? data.extratags?.waterway ?? '',
    place: data.address?.place ?? '',
  };

  return {
    water_body: name,
    water_body_type: inferWaterBodyType(tags),
    location_address: data.display_name ?? null,
  };
}

// ---------------------------------------------------------------------------
// Forward geocode — location search
// Rate limit: 1 req/sec (same as reverse). Use only on explicit user action.
// ---------------------------------------------------------------------------

export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '10',
    addressdetails: '1',
    extratags: '1',
    namedetails: '1',
    dedupe: '1',
    'accept-language': deviceLocale,
  });

  const response = await fetch(`${BASE}/search?${params}`, {
    headers: { ...HEADERS, 'Accept-Language': deviceLocale },
  });

  if (!response.ok) throw new Error(`Nominatim search error: ${response.status}`);

  const data: any[] = await response.json();
  return data.map(item => ({
    name: item.namedetails?.name ?? item.name ?? null,
    display_name: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    water_body_type: inferWaterBodyType({
      natural: item.address?.natural ?? '',
      water: item.extratags?.water ?? '',
      waterway: item.address?.waterway ?? item.extratags?.waterway ?? '',
      place: item.address?.place ?? '',
    }),
  }));
}
