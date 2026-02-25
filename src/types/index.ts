// All shared TypeScript types — check here before adding new fields

export interface Trip {
  id: number;
  title: string;
  companions: string | null;
  notes: string | null;
  target_species: string | null;
  is_guided: 0 | 1;
  catch_count_mode: 'auto' | 'manual';
  catch_count_manual: number | null;
  created_at: string;
  updated_at: string;
  // Computed by getAllTripsWithCatches
  unsynced_count?: number;
  catches?: Catch[];
}

export interface Catch {
  id: number;
  trip_id: number | null;
  photo_uri: string | null;
  species: string | null;
  species_scientific: string | null;
  species_confidence: number | null;
  caught_at: string;
  latitude: number | null;
  longitude: number | null;
  water_body: string | null;
  water_body_type: WaterBodyType | null;
  weight_lbs: number | null;
  water_temp_f: number | null;
  notes: string | null;
  weather_temp_f: number | null;
  weather_condition: string | null;
  weather_wind_mph: number | null;
  weather_precipitation_in: number | null;
  needs_sync: 0 | 1;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gear {
  id: number;
  name: string;
  type: GearType;
  brand: string | null;
  model: string | null;
  notes: string | null;
  // Computed
  catch_count?: number;
}

export interface CatchGear {
  catch_id: number;
  gear_id: number;
}

export interface Setting {
  key: string;
  value: string;
}

// Enums / union types

export type WaterBodyType =
  | 'river'
  | 'stream'
  | 'lake'
  | 'pond'
  | 'ocean'
  | 'reservoir'
  | 'unknown';

export type GearType =
  | 'rod'
  | 'reel'
  | 'line'
  | 'lure'
  | 'fly'
  | 'hook'
  | 'weight'
  | 'bobber'
  | 'leader'
  | 'net'
  | 'other';

export const GEAR_TYPES: GearType[] = [
  'rod', 'reel', 'line', 'lure', 'fly',
  'hook', 'weight', 'bobber', 'leader', 'net', 'other',
];

export const WATER_BODY_TYPES: WaterBodyType[] = [
  'river', 'stream', 'lake', 'pond', 'ocean', 'reservoir', 'unknown',
];

// iNaturalist

export interface SpeciesSuggestion {
  taxon_id: number;
  common_name: string | null;
  scientific_name: string;
  confidence: number; // 0–1
}

// Sync

export interface SyncResult {
  catch_id: number;
  success: boolean;
  error?: string;
}
