import type { WaterBodyType } from '../types';

const BASE_URL = 'https://nominatim.openstreetmap.org/reverse';
// Rate limit: 1 req/sec — callers must enforce delay between requests

export interface GeocodingResult {
  water_body: string | null;
  water_body_type: WaterBodyType;
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
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    namedetails: '1',
    zoom: '14',
  });

  const response = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      'User-Agent': 'FishingJournalApp/1.0 (personal mobile app, not for redistribution)',
    },
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
  };
}
