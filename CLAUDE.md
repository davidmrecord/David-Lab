# CLAUDE.md — Fishing Journal

Personal mobile fishing journal app. Expo (React Native) + SQLite, fully on-device with no backend. See `BRIEF.md` for full product context.

## Project Overview

- **Platform:** iOS & Android via Expo (React Native)
- **Data storage:** SQLite (all local, no server sync)
- **Purpose:** Log fishing catches and trips, with optional offline enrichment via iNaturalist/Nominatim APIs
- **No backend:** `needs_sync` is purely for local API enrichment, not server sync

## Getting Started

```bash
npm install
npx expo start
```

## Architecture

### Directory Structure

```
src/
├── db/
│   └── database.ts          # All SQLite schema, CRUD, persistPhoto, getSetting/setSetting
├── services/
│   └── sync.ts              # Offline catch enrichment (blank-fields-only rule)
├── theme/
│   ├── palettes.ts          # 4 palettes + ColorPalette type
│   └── ThemeContext.tsx     # ThemeProvider + useTheme()
├── hooks/
│   └── useNetworkStatus.ts  # { isOffline } — branch online vs offline entry
├── navigation/
│   └── AppNavigator.tsx     # All screen registrations + JournalStackParams type
└── types/
    └── index.ts             # All shared types — check here before adding fields
```

## Critical Patterns

### 1. Dynamic Theming (Required on Every Screen)

Every screen uses dynamic theming — never static styles:

```tsx
const { colors: COLORS } = useTheme();
const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
```

- `StyleSheet.create` lives **inside** `function makeStyles(COLORS: ColorPalette)`
- Sub-components within a screen each call `useTheme()` individually
- **Never** import `COLORS` directly from `navigation/theme.ts` in screens — that's the static fallback used only in `App.tsx` before `ThemeProvider` mounts

### 2. Photo URI Persistence (Required Before Every DB Write)

`expo-image-picker` returns temp cache URIs that die on app restart. Always persist before saving:

```tsx
if (photoUri) photoUri = await persistPhoto(photoUri);
```

- `persistPhoto()` is in `database.ts` — copies to `documentDirectory/photos/`
- Call it in **every** flow that writes a `photo_uri` to the database
- Skipping this causes photos to disappear after app restart

### 3. Sync Rule — Never Overwrite User-Entered Data

The sync service fills **only null/blank fields**. If a user typed a species name offline, the iNaturalist result is discarded for that field. This is intentional and must be preserved in all sync logic edits.

## Key Files Reference

| File | Responsibility |
|---|---|
| `src/db/database.ts` | SQLite schema, all CRUD operations, `persistPhoto`, `getSetting`/`setSetting` |
| `src/types/index.ts` | All shared TypeScript types — check here before adding new fields |
| `src/services/sync.ts` | Offline catch enrichment; blank-fields-only rule lives here |
| `src/theme/palettes.ts` | 4 color palettes + `ColorPalette` type definition |
| `src/theme/ThemeContext.tsx` | `ThemeProvider` + `useTheme()` hook |
| `src/hooks/useNetworkStatus.ts` | `{ isOffline }` — used to branch online vs offline entry flows |
| `src/navigation/AppNavigator.tsx` | Screen registrations + `JournalStackParams` type |

## Gotchas & Invariants

### Offline / Sync
- Catches logged offline get `needs_sync = 1`
- Use `syncTrip(tripId)` or `syncAll()` from `services/sync.ts` to trigger enrichment
- `autoCreateTrip()` fires when a catch is saved with no trip selected — **do not remove** this safety net

### API Rate Limits
- Nominatim (reverse geocoding) rate limit: **1 req/sec**
- Do not add retry loops without a delay between requests

### Database Queries
- `getTripById` and `getAllTripsWithCatches` both select `unsynced_count`
- Keep `unsynced_count` in any query rewrites — removing it breaks the sync badge UI

### Schema Migrations
- Schema uses a single v1 migration pattern
- To add columns: increment `CURRENT_SCHEMA_VERSION` and add an `if (fromVersion < N)` block in `runMigrations()`
- Do not alter existing migrations

## What's Intentionally Missing

Do not re-add these without explicit discussion:

- **Flow rate** — removed; belongs in a future "Plan a Trip" module; do not add to catch forms
- **Backend / sync-to-server** — out of scope; `needs_sync` is for local API enrichment only, not server sync

## Development Conventions

- Check `src/types/index.ts` before adding any new data fields
- Follow the dynamic theming pattern on all new screens and components
- Always call `persistPhoto()` before writing any `photo_uri` to SQLite
- Preserve the blank-fields-only sync rule when modifying `services/sync.ts`
- Do not introduce new direct imports of `COLORS` from `navigation/theme.ts` in screen files
