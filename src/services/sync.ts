// Offline catch enrichment.
// Core rule: ONLY fill null/blank fields — never overwrite user-entered data.

import {
  getCatchById,
  getUnsyncedCatches,
  updateCatch,
} from '../db/database';
import { identifyFish } from './iNaturalist';
import { fetchHistoricalWeather } from './weather';
import { reverseGeocode, formatCoords } from './geocoding';
import type { Catch, SyncResult } from '../types';

const NOMINATIM_DELAY_MS = 1100; // 1 req/sec limit

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichCatch(c: Catch): Promise<SyncResult> {
  try {
    const updates: Partial<Omit<Catch, 'id' | 'created_at' | 'updated_at'>> = {};

    // 1. Fish ID — only if photo present and species blank
    if (c.photo_uri && !c.species) {
      const result = await identifyFish(c.photo_uri);
      if (result.topSuggestion) {
        updates.species = result.topSuggestion.common_name ?? undefined;
        updates.species_scientific = result.topSuggestion.scientific_name;
        updates.species_confidence = result.topSuggestion.confidence;
      }
    }

    // 2. Weather — only fill null fields individually
    if (
      c.latitude != null &&
      c.longitude != null &&
      (c.weather_temp_f == null ||
        c.weather_condition == null ||
        c.weather_wind_mph == null ||
        c.weather_precipitation_in == null)
    ) {
      const w = await fetchHistoricalWeather(c.latitude, c.longitude, c.caught_at);
      if (c.weather_temp_f == null && w.temp_f != null) updates.weather_temp_f = w.temp_f;
      if (c.weather_condition == null && w.condition) updates.weather_condition = w.condition;
      if (c.weather_wind_mph == null && w.wind_mph != null) updates.weather_wind_mph = w.wind_mph;
      if (c.weather_precipitation_in == null && w.precipitation_in != null)
        updates.weather_precipitation_in = w.precipitation_in;
    }

    // 3. Geocoding + raw location — only if GPS available
    if (c.latitude != null && c.longitude != null) {
      if (!c.location_coords) {
        updates.location_coords = formatCoords(c.latitude, c.longitude);
      }
      if (!c.water_body || !c.location_address) {
        await sleep(NOMINATIM_DELAY_MS);
        const geo = await reverseGeocode(c.latitude, c.longitude);
        if (!c.water_body && geo.water_body) updates.water_body = geo.water_body;
        if (c.water_body_type == null) updates.water_body_type = geo.water_body_type;
        if (!c.location_address && geo.location_address)
          updates.location_address = geo.location_address;
      }
    }

    await updateCatch(c.id, {
      ...updates,
      needs_sync: 0,
      synced_at: new Date().toISOString(),
    });

    return { catch_id: c.id, success: true };
  } catch (err) {
    // Leave needs_sync = 1 so it retries next time
    return {
      catch_id: c.id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function syncTrip(tripId: number): Promise<SyncResult[]> {
  const catches = await getUnsyncedCatches(tripId);
  const results: SyncResult[] = [];
  for (const c of catches) {
    results.push(await enrichCatch(c));
  }
  return results;
}

export async function syncAll(): Promise<SyncResult[]> {
  const catches = await getUnsyncedCatches();
  const results: SyncResult[] = [];
  for (const c of catches) {
    results.push(await enrichCatch(c));
  }
  return results;
}
