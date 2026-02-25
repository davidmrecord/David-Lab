# CLAUDE.md — Fishing Journal

Personal mobile fishing journal app. Expo (React Native) + SQLite, fully on-device with no backend. See `BRIEF.md` for full product context.

## Project Overview

- **Platform:** iOS & Android via Expo (React Native)
- **Data storage:** SQLite (all local, no server sync)
- **Purpose:** Log fishing catches and trips, with optional offline enrichment via free, keyless APIs
- **No backend:** `needs_sync` is purely for local API enrichment, not server sync
- **No accounts, no subscriptions, no API keys required**

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | Expo ~51.0, managed workflow | |
| Language | TypeScript ~5.3 | strict mode |
| Local DB | expo-sqlite ~14.0 | all data on-device |
| Navigation | React Navigation 6 | bottom tabs + native stack |
| Camera / EXIF | expo-image-picker + expo-media-library | GPS, date/time extraction |
| Photo persistence | expo-file-system | copies picker temp URIs to documentDirectory |
| Fish ID | iNaturalist Vision API | free, no key, image-based |
| Weather | Open-Meteo Historical API | free, no key, ERA5 reanalysis |
| Reverse Geocoding | OpenStreetMap Nominatim | free, no key, 1 req/sec limit |
| Connectivity | @react-native-community/netinfo | offline detection |
| Animation | react-native-svg | trout loader animation |
| Theme | Custom ThemeContext + SQLite persistence | 4 palettes |

## Getting Started

```bash
npm install
npx expo start
```

## Project Structure

```
fishing-journal/
├── App.tsx                              # DB init, ThemeProvider, AppShell, OfflineBanner
├── app.json                             # Expo config, permissions, plugins
├── package.json
├── BRIEF.md                             # Full product brief
├── src/
│   ├── types/index.ts                   # All shared TypeScript types + constants
│   ├── db/
│   │   └── database.ts                  # SQLite schema, all CRUD, persistPhoto, settings
│   ├── services/
│   │   ├── photo.ts                     # Camera/library picker, EXIF extraction
│   │   ├── iNaturalist.ts               # Fish ID via iNaturalist Vision API
│   │   ├── weather.ts                   # Historical weather via Open-Meteo
│   │   ├── geocoding.ts                 # Reverse geocode via Nominatim
│   │   └── sync.ts                      # Offline catch enrichment, blank-fields-only rule
│   ├── hooks/
│   │   └── useNetworkStatus.ts          # NetInfo wrapper
│   ├── components/
│   │   ├── TroutLoader.tsx              # Animated SVG trout progress indicator
│   │   └── OfflineBanner.tsx            # Slide-in offline status banner
│   ├── theme/
│   │   ├── palettes.ts                  # ColorPalette type + 4 named palettes
│   │   └── ThemeContext.tsx             # ThemeProvider + useTheme hook
│   ├── navigation/
│   │   ├── AppNavigator.tsx             # Bottom tabs, all stack screens, avatar header
│   │   └── theme.ts                     # Static COLORS, SPACING, RADIUS, FONT constants
│   └── screens/
│       ├── JournalListScreen.tsx        # Trip cards, thumbnail strips, sync badges
│       ├── TripDetailScreen.tsx         # Trip detail, catch list, sync banner, count toggle
│       ├── CatchDetailScreen.tsx        # Full catch detail with sync pill, edit/delete
│       ├── EditCatchScreen.tsx          # Edit species, weight, water body, gear, photo
│       ├── EditTripScreen.tsx           # Edit title, companions, target species, notes
│       ├── GearLibraryScreen.tsx        # Gear grouped by type, usage counts
│       ├── AddGearScreen.tsx            # Add / edit gear form
│       ├── NewTripScreen.tsx            # New trip modal
│       ├── SettingsScreen.tsx           # Theme picker + avatar picker
│       └── NewEntryFlow/
│           ├── index.tsx                # Online entry: photo → loading (TroutLoader) → review
│           └── OfflineEntryForm.tsx     # Offline entry: stripped form, saves needs_sync=1
```

## Data Model

Five tables. Schema version tracked via `PRAGMA user_version`. Single clean v1 migration.

### `trips`
Primary organizational unit. Every catch belongs to a trip.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| title | TEXT | required |
| companions | TEXT | free text, e.g. "Dad, Mike" |
| notes | TEXT | |
| target_species | TEXT | |
| is_guided | INTEGER | SQLite bool: 0 = solo, 1 = guided |
| catch_count_mode | TEXT | `'auto'` or `'manual'` |
| catch_count_manual | INTEGER | nullable, only used when mode = 'manual' |
| created_at / updated_at | TEXT | ISO 8601 |

### `catches`
The journal entries. Always has a `trip_id`.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| trip_id | INTEGER FK | → trips, ON DELETE SET NULL |
| photo_uri | TEXT | nullable; permanent path in documentDirectory/photos/ |
| species | TEXT | common name, from iNaturalist or manual |
| species_scientific | TEXT | scientific name, from iNaturalist |
| species_confidence | REAL | 0–1, from iNaturalist |
| caught_at | TEXT | ISO 8601 datetime |
| latitude / longitude | REAL | from EXIF |
| water_body | TEXT | from Nominatim |
| water_body_type | TEXT | river/stream/lake/pond/ocean/reservoir/unknown |
| weight_lbs | REAL | |
| water_temp_f | REAL | manual entry |
| notes | TEXT | |
| weather_temp_f | REAL | from Open-Meteo |
| weather_condition | TEXT | |
| weather_wind_mph | REAL | |
| weather_precipitation_in | REAL | |
| needs_sync | INTEGER | 0 = fully enriched, 1 = logged offline, pending API fill |
| synced_at | TEXT | timestamp of last successful sync |
| created_at / updated_at | TEXT | |

### `gear`
Reference library of fishing tackle.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | required |
| type | TEXT | rod/reel/line/lure/fly/hook/weight/bobber/leader/net/other |
| brand | TEXT | |
| model | TEXT | |
| notes | TEXT | |

### `catch_gear`
Many-to-many join between catches and gear. Cascade deletes on both sides.

### `settings`
Key/value store for app preferences. Keys in use: `theme` (palette name), `avatar_uri` (profile photo path).

## Screens & Navigation

### Bottom Tabs
- **Journal** — trip-first journal list
- **Gear** — gear reference library

### Journal Stack

| Screen | Route | Purpose |
|---|---|---|
| JournalListScreen | `JournalList` | Trip cards with catch thumbnail strips, sync pending badges |
| TripDetailScreen | `TripDetail` | Catches for one trip, catch count toggle, sync button |
| CatchDetailScreen | `CatchDetail` | Full detail for one catch, edit + delete |
| EditCatchScreen | `EditCatch` | Edit species, weight, water body, gear, notes, photo |
| EditTripScreen | `EditTrip` | Edit title, companions, target species, notes, guided toggle |
| NewEntryFlow | `NewEntry` | Photo-first or offline entry |
| NewTripScreen | `NewTrip` | Create a trip (modal) |
| SettingsScreen | `Settings` | Theme palette picker + profile avatar picker (modal) |

### Gear Stack

| Screen | Route | Purpose |
|---|---|---|
| GearLibraryScreen | `GearLibrary` | All gear grouped by type with catch counts |
| AddGearScreen | `AddGear` | Add / edit gear item |

## Entry Flow

### Online path
1. **Photo step** — Take Photo / Choose from Library / Skip (manual)
2. **Loading step** — Three API calls run in parallel, driving `TroutLoader` progress (0→1):
   - iNaturalist Vision: species ID from photo → common name, scientific name, confidence, top 5
   - Open-Meteo: historical weather for GPS + date → temp, condition, wind, precipitation
   - Nominatim: reverse geocode → water body name + type
3. **Review step** — user confirms auto-populated fields, enters manual fields (weight, water temp, notes, gear). Trip section is collapsible — collapsed by default on manual/skip entry, open when coming from a photo.

### Offline path
When `useNetworkStatus()` returns `isOffline = true`, `NewEntryFlow` mounts `OfflineEntryForm` instead of the photo step. Stripped form: photo (optional), species (text only), weight, water temp, notes, trip assignment. Saves with `needs_sync = 1`.

### Auto-create trip
If the user doesn't select or name a trip on save, `autoCreateTrip(waterBody, datetime)` fires and creates a trip titled `"[Location] · [Date]"`. **Do not remove this safety net.**

## Sync System

Catches logged offline have `needs_sync = 1`. Sync runs when user taps "Sync now".

**Core rule: only fill blank fields — never overwrite something the user typed manually.**

- `syncTrip(tripId)` — syncs all unsynced catches for one trip
- `syncAll()` — syncs everything
- Per catch: fish ID (if photo present and species blank), weather (per-field null check), geocoding (if water_body blank)
- On success: `needs_sync = 0`, `synced_at = now`
- On failure: `needs_sync` stays 1, retries on next sync call

**UI surfaces for unsynced catches:**
- `🔄 N pending` badge on trip cards in `JournalList`
- Sync banner with "Sync now" button above catch list in `TripDetail`
- `🔄` icon on individual catch rows

## Critical Patterns

### 1. Dynamic Theming (Required on Every Screen)

Every screen uses dynamic theming — never static styles:

```tsx
const { colors: COLORS } = useTheme();
const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
```

- `StyleSheet.create` lives **inside** `function makeStyles(COLORS: ColorPalette)`
- Sub-components within a screen each call `useTheme()` individually
- **Never** import `COLORS` directly from `navigation/theme.ts` in screens — that's the static fallback used only in `App.tsx` before `ThemeProvider` mounts (DB loading and error screens)

### 2. Photo URI Persistence (Required Before Every DB Write)

`expo-image-picker` returns temp cache URIs that die on app restart. Always persist before saving:

```tsx
if (photoUri) photoUri = await persistPhoto(photoUri);
```

- `persistPhoto()` is in `database.ts` — copies to `documentDirectory/photos/`
- Call it in **every** flow that writes a `photo_uri` to the database: `NewEntryFlow`, `OfflineEntryForm`, `EditCatchScreen`
- Skipping this causes photos to disappear after app restart

### 3. Sync Rule — Never Overwrite User-Entered Data

The sync service fills **only null/blank fields**. If a user typed a species name offline, the iNaturalist result is discarded for that field. This is intentional and must be preserved in all sync logic edits.

## Theme System

Four named palettes in `src/theme/palettes.ts`, each a complete `ColorPalette` object:
- **Forest** (default) — deep green, warm off-white
- **River** — slate blue, cool grey
- **Dusk** — amber, terracotta
- **Desert** — sage, sand

`ThemeContext.tsx` — `ThemeProvider` wraps the entire app (inside `SafeAreaProvider`, outside DB-loading screen). `useTheme()` returns `{ colors, themeName, setTheme }`. Persisted to the `settings` table.

`navigation/theme.ts` holds the static Forest palette — used **only** in `App.tsx` before `ThemeProvider` mounts.

## Connectivity

`src/hooks/useNetworkStatus.ts` returns `{ isConnected, isInternetReachable, isOffline, isLoading }`. Treats `null` reachability as online to avoid false positives on mount.

`OfflineBanner` (animated slide-in) is mounted in `AppShell` inside `App.tsx`, visible on all screens when offline.

## Components

### TroutLoader (`src/components/TroutLoader.tsx`)
SVG trout silhouette that fills left-to-right (tail → mouth) via a `ClipPath` driven by a `progress` prop (0–1). Uses theme `primary`/`primaryDark` colors. Breathing pulse animation when idle (`animate` prop).

Used in:
- `App.tsx` DB loading screen — idle breathing animation
- `NewEntryFlow` loading step — driven by API call completions (~0.33 per completed call)

## Key Files Reference

| File | Responsibility |
|---|---|
| `src/db/database.ts` | SQLite schema, all CRUD, `persistPhoto`, `getSetting`/`setSetting` |
| `src/types/index.ts` | All shared TypeScript types — check here before adding new fields |
| `src/services/sync.ts` | Offline catch enrichment; blank-fields-only rule lives here |
| `src/services/photo.ts` | Camera/library picker, EXIF (GPS + datetime) extraction |
| `src/services/iNaturalist.ts` | Fish ID via iNaturalist Vision API |
| `src/services/weather.ts` | Historical weather via Open-Meteo |
| `src/services/geocoding.ts` | Reverse geocode via Nominatim; User-Agent header required |
| `src/theme/palettes.ts` | 4 color palettes + `ColorPalette` type definition |
| `src/theme/ThemeContext.tsx` | `ThemeProvider` + `useTheme()` hook |
| `src/hooks/useNetworkStatus.ts` | Offline detection, used to branch entry flow |
| `src/navigation/AppNavigator.tsx` | Screen registrations + `JournalStackParams` type |

## Gotchas & Invariants

### Database Queries
- `getTripById` and `getAllTripsWithCatches` both select `unsynced_count`
- Keep `unsynced_count` in any query rewrites — removing it breaks the sync badge UI

### Schema Migrations
- Schema uses a single v1 migration pattern
- To add columns: increment `CURRENT_SCHEMA_VERSION` and add an `if (fromVersion < N)` block in `runMigrations()`
- Do not alter existing migrations

### API Rate Limits
- Nominatim rate limit: **1 req/sec** — do not add retry loops without a delay
- Nominatim requires a descriptive `User-Agent` header (set in `geocoding.ts`)
- iNaturalist and Open-Meteo have no practical rate limits for this use case

## API Reference

### iNaturalist Vision
- `POST https://api.inaturalist.org/v1/computervision/score_image`
- No auth. Multipart form upload. Results filtered to fish taxa (Actinopterygii + Chondrichthyes).
- Returns top 5 suggestions with confidence scores, common name, scientific name.

### Open-Meteo Historical
- `GET https://archive-api.open-meteo.com/v1/archive`
- ERA5 reanalysis. Historical coverage back to 1940. Returns daily summary.
- Fields used: `temperature_2m_max`, `windspeed_10m_max`, `precipitation_sum`, `weathercode`

### Nominatim Reverse Geocoding
- `GET https://nominatim.openstreetmap.org/reverse`
- Rate limit: **1 req/sec**. Must include descriptive `User-Agent` header.
- Water body type inferred from OSM `type`, `category`, and `namedetails` fields.

## What's Intentionally Missing

Do not re-add these without explicit discussion:

- **Flow rate** — removed entirely; belongs in the future "Plan a Trip" module alongside USGS gauge links, hatch charts, and pre-trip conditions. Not a field anglers know from memory.
- **Backend / sync-to-server** — out of scope; `needs_sync` is for local API enrichment only

## Planned Future Modules (not yet started)

Do not implement these speculatively:
- **Plan a Trip** — USGS gauge links, flow rate, hatch charts, access info, gear planning
- **Statistics screen** — total catches, species breakdown, best spots, best conditions
- **Map view** — catch locations on a map
- **Photo carousel** — swipeable gallery in catch detail
- **Export** — CSV export or shareable catch card
- **Species autocomplete** — iNaturalist search API for the species text field

## Development Conventions

- Check `src/types/index.ts` before adding any new data fields
- Follow the dynamic theming pattern on all new screens and components
- Always call `persistPhoto()` before writing any `photo_uri` to SQLite
- Preserve the blank-fields-only sync rule when modifying `services/sync.ts`
- Do not introduce new direct imports of `COLORS` from `navigation/theme.ts` in screen files
- Do not implement features from the "Planned Future Modules" list without being asked
