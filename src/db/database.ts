import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import type { Trip, Catch, Gear, WaterBodyType, GalleryCatch, GalleryFilters } from '../types';

const CURRENT_SCHEMA_VERSION = 2;

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('fishing_journal.db');
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Schema & migrations
// ---------------------------------------------------------------------------

export async function initDatabase(): Promise<void> {
  const db = await getDb();

  const { user_version } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  ) ?? { user_version: 0 };

  await runMigrations(db, user_version);
}

async function runMigrations(
  db: SQLite.SQLiteDatabase,
  fromVersion: number
): Promise<void> {
  if (fromVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trips (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        title              TEXT    NOT NULL,
        companions         TEXT,
        notes              TEXT,
        target_species     TEXT,
        is_guided          INTEGER NOT NULL DEFAULT 0,
        catch_count_mode   TEXT    NOT NULL DEFAULT 'auto',
        catch_count_manual INTEGER,
        created_at         TEXT    NOT NULL,
        updated_at         TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS catches (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id                 INTEGER REFERENCES trips(id) ON DELETE SET NULL,
        photo_uri               TEXT,
        species                 TEXT,
        species_scientific      TEXT,
        species_confidence      REAL,
        caught_at               TEXT    NOT NULL,
        latitude                REAL,
        longitude               REAL,
        water_body              TEXT,
        water_body_type         TEXT,
        weight_lbs              REAL,
        water_temp_f            REAL,
        notes                   TEXT,
        weather_temp_f          REAL,
        weather_condition       TEXT,
        weather_wind_mph        REAL,
        weather_precipitation_in REAL,
        needs_sync              INTEGER NOT NULL DEFAULT 0,
        synced_at               TEXT,
        created_at              TEXT    NOT NULL,
        updated_at              TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS gear (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        name   TEXT NOT NULL,
        type   TEXT NOT NULL,
        brand  TEXT,
        model  TEXT,
        notes  TEXT
      );

      CREATE TABLE IF NOT EXISTS catch_gear (
        catch_id INTEGER NOT NULL REFERENCES catches(id) ON DELETE CASCADE,
        gear_id  INTEGER NOT NULL REFERENCES gear(id)   ON DELETE CASCADE,
        PRIMARY KEY (catch_id, gear_id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      PRAGMA user_version = 1;
    `);
  }

  if (fromVersion < 2) {
    await db.execAsync(`
      ALTER TABLE catches ADD COLUMN location_coords TEXT;
      ALTER TABLE catches ADD COLUMN location_address TEXT;
      PRAGMA user_version = 2;
    `);
  }
}

// ---------------------------------------------------------------------------
// Photo persistence
// ---------------------------------------------------------------------------

export async function persistPhoto(tempUri: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}photos/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const filename = `catch_${Date.now()}.jpg`;
  const dest = `${dir}${filename}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

// ---------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------

export async function getAllTripsWithCatches(): Promise<Trip[]> {
  const db = await getDb();
  const trips = await db.getAllAsync<Trip & { unsynced_count: number }>(`
    SELECT
      t.*,
      COUNT(CASE WHEN c.needs_sync = 1 THEN 1 END) AS unsynced_count
    FROM trips t
    LEFT JOIN catches c ON c.trip_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `);

  const result: Trip[] = [];
  for (const trip of trips) {
    const catches = await db.getAllAsync<Catch>(
      'SELECT * FROM catches WHERE trip_id = ? ORDER BY caught_at DESC',
      [trip.id]
    );
    result.push({ ...trip, catches });
  }
  return result;
}

export async function getTripById(id: number): Promise<Trip | null> {
  const db = await getDb();
  const trip = await db.getFirstAsync<Trip & { unsynced_count: number }>(`
    SELECT
      t.*,
      COUNT(CASE WHEN c.needs_sync = 1 THEN 1 END) AS unsynced_count
    FROM trips t
    LEFT JOIN catches c ON c.trip_id = t.id
    WHERE t.id = ?
    GROUP BY t.id
  `, [id]);
  if (!trip) return null;

  const catches = await db.getAllAsync<Catch>(
    'SELECT * FROM catches WHERE trip_id = ? ORDER BY caught_at DESC',
    [id]
  );
  return { ...trip, catches };
}

export async function createTrip(
  data: Omit<Trip, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO trips (title, companions, notes, target_species, is_guided, catch_count_mode, catch_count_manual, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title, data.companions ?? null, data.notes ?? null,
      data.target_species ?? null, data.is_guided,
      data.catch_count_mode, data.catch_count_manual ?? null,
      now, now,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateTrip(
  id: number,
  data: Partial<Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'catches' | 'unsynced_count'>>
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), now, id];
  await db.runAsync(
    `UPDATE trips SET ${fields}, updated_at = ? WHERE id = ?`,
    values
  );
}

export async function deleteTrip(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM trips WHERE id = ?', [id]);
}

export async function autoCreateTrip(
  waterBody: string | null,
  datetime: string
): Promise<number> {
  const date = new Date(datetime).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const title = waterBody ? `${waterBody} · ${date}` : `Trip · ${date}`;
  return createTrip({
    title,
    companions: null,
    notes: null,
    target_species: null,
    is_guided: 0,
    catch_count_mode: 'auto',
    catch_count_manual: null,
  });
}

// ---------------------------------------------------------------------------
// Catches
// ---------------------------------------------------------------------------

export async function getCatchById(id: number): Promise<Catch | null> {
  const db = await getDb();
  return db.getFirstAsync<Catch>('SELECT * FROM catches WHERE id = ?', [id]);
}

export async function createCatch(
  data: Omit<Catch, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO catches (
      trip_id, photo_uri, species, species_scientific, species_confidence,
      caught_at, latitude, longitude, water_body, water_body_type,
      weight_lbs, water_temp_f, notes,
      weather_temp_f, weather_condition, weather_wind_mph, weather_precipitation_in,
      location_coords, location_address,
      needs_sync, synced_at, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.trip_id ?? null, data.photo_uri ?? null,
      data.species ?? null, data.species_scientific ?? null, data.species_confidence ?? null,
      data.caught_at, data.latitude ?? null, data.longitude ?? null,
      data.water_body ?? null, data.water_body_type ?? null,
      data.weight_lbs ?? null, data.water_temp_f ?? null, data.notes ?? null,
      data.weather_temp_f ?? null, data.weather_condition ?? null,
      data.weather_wind_mph ?? null, data.weather_precipitation_in ?? null,
      data.location_coords ?? null, data.location_address ?? null,
      data.needs_sync, data.synced_at ?? null, now, now,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateCatch(
  id: number,
  data: Partial<Omit<Catch, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), now, id];
  await db.runAsync(
    `UPDATE catches SET ${fields}, updated_at = ? WHERE id = ?`,
    values
  );
}

export async function deleteCatch(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM catches WHERE id = ?', [id]);
}

export async function getUnsyncedCatches(tripId?: number): Promise<Catch[]> {
  const db = await getDb();
  if (tripId !== undefined) {
    return db.getAllAsync<Catch>(
      'SELECT * FROM catches WHERE needs_sync = 1 AND trip_id = ?',
      [tripId]
    );
  }
  return db.getAllAsync<Catch>('SELECT * FROM catches WHERE needs_sync = 1');
}

// ---------------------------------------------------------------------------
// Gear
// ---------------------------------------------------------------------------

export async function getAllGear(): Promise<Gear[]> {
  const db = await getDb();
  return db.getAllAsync<Gear>(`
    SELECT g.*, COUNT(cg.catch_id) AS catch_count
    FROM gear g
    LEFT JOIN catch_gear cg ON cg.gear_id = g.id
    GROUP BY g.id
    ORDER BY g.type, g.name
  `);
}

export async function getGearById(id: number): Promise<Gear | null> {
  const db = await getDb();
  return db.getFirstAsync<Gear>('SELECT * FROM gear WHERE id = ?', [id]);
}

export async function createGear(
  data: Omit<Gear, 'id' | 'catch_count'>
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO gear (name, type, brand, model, notes) VALUES (?,?,?,?,?)',
    [data.name, data.type, data.brand ?? null, data.model ?? null, data.notes ?? null]
  );
  return result.lastInsertRowId;
}

export async function updateGear(
  id: number,
  data: Partial<Omit<Gear, 'id' | 'catch_count'>>
): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), id];
  await db.runAsync(`UPDATE gear SET ${fields} WHERE id = ?`, values);
}

export async function deleteGear(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM gear WHERE id = ?', [id]);
}

// ---------------------------------------------------------------------------
// Catch ↔ Gear
// ---------------------------------------------------------------------------

export async function getGearForCatch(catchId: number): Promise<Gear[]> {
  const db = await getDb();
  return db.getAllAsync<Gear>(
    'SELECT g.* FROM gear g JOIN catch_gear cg ON cg.gear_id = g.id WHERE cg.catch_id = ?',
    [catchId]
  );
}

export async function setGearForCatch(
  catchId: number,
  gearIds: number[]
): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM catch_gear WHERE catch_id = ?', [catchId]);
  for (const gearId of gearIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO catch_gear (catch_id, gear_id) VALUES (?, ?)',
      [catchId, gearId]
    );
  }
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export async function getAllCatchesForGallery(
  filters?: GalleryFilters
): Promise<GalleryCatch[]> {
  const db = await getDb();
  const conditions: string[] = ['c.photo_uri IS NOT NULL'];
  const params: (string | number)[] = [];

  if (filters?.species) {
    conditions.push('c.species LIKE ?');
    params.push(`%${filters.species}%`);
  }
  if (filters?.tripId !== undefined) {
    conditions.push('c.trip_id = ?');
    params.push(filters.tripId);
  }
  if (filters?.waterBody) {
    conditions.push('c.water_body LIKE ?');
    params.push(`%${filters.waterBody}%`);
  }
  if (filters?.dateFrom) {
    conditions.push('c.caught_at >= ?');
    params.push(filters.dateFrom);
  }
  if (filters?.dateTo) {
    conditions.push('c.caught_at <= ?');
    params.push(`${filters.dateTo}T23:59:59`);
  }

  const where = conditions.join(' AND ');
  return db.getAllAsync<GalleryCatch>(
    `SELECT c.*, t.title as trip_title
     FROM catches c
     LEFT JOIN trips t ON t.id = c.trip_id
     WHERE ${where}
     ORDER BY c.caught_at DESC`,
    params
  );
}
