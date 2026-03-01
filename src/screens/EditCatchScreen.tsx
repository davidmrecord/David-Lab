import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getCatchById, updateCatch, getAllGear, persistPhoto, getGearForCatch, setGearForCatch } from '../db/database';
import { pickPhotoFromLibrary, getDeviceLocation } from '../services/photo';
import { reverseGeocode, formatCoords, searchLocations } from '../services/geocoding';
import type { LocationSearchResult } from '../services/geocoding';
import MapPinWidget from '../components/MapPinWidget';
import type { ColorPalette } from '../theme/palettes';
import type { Gear, WaterBodyType } from '../types';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

type Props = JournalScreenProps<'EditCatch'>;

export default function EditCatchScreen({ route, navigation }: Props) {
  const { catchId } = route.params;
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [species, setSpecies] = useState('');
  const [waterBody, setWaterBody] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [waterTempF, setWaterTempF] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationCoords, setLocationCoords] = useState<string | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [waterBodyType, setWaterBodyType] = useState<WaterBodyType | null>(null);
  const [allGear, setAllGear] = useState<Gear[]>([]);
  const [selectedGearIds, setSelectedGearIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  useEffect(() => {
    Promise.all([getCatchById(catchId), getAllGear(), getGearForCatch(catchId)]).then(
      ([c, gear, catchGear]) => {
        if (!c) return;
        setPhotoUri(c.photo_uri);
        setSpecies(c.species ?? '');
        setWaterBody(c.water_body ?? '');
        setWeightLbs(c.weight_lbs ? String(c.weight_lbs) : '');
        setWaterTempF(c.water_temp_f ? String(c.water_temp_f) : '');
        setNotes(c.notes ?? '');
        setLatitude(c.latitude);
        setLongitude(c.longitude);
        setLocationCoords(c.location_coords);
        setLocationAddress(c.location_address);
        setWaterBodyType(c.water_body_type);
        setAllGear(gear);
        setSelectedGearIds(new Set(catchGear.map(g => g.id)));
      }
    );
  }, [catchId]);

  const handlePickPhoto = async () => {
    const result = await pickPhotoFromLibrary();
    if (result) setPhotoUri(result.uri);
  };

  const applyLocation = (
    lat: number,
    lon: number,
    coords: string,
    address: string | null,
    wbType: WaterBodyType | null,
    wbName: string | null,
  ) => {
    setLatitude(lat);
    setLongitude(lon);
    setLocationCoords(coords);
    setLocationAddress(address);
    setWaterBodyType(wbType);
    if (!waterBody.trim() && wbName) setWaterBody(wbName);
    setSearchResults([]);
    setLocationSearch('');
  };

  const handleSearch = async () => {
    const q = locationSearch.trim();
    if (!q) return;
    setSearching(true);
    try {
      const results = await searchLocations(q);
      setSearchResults(results);
      if (results.length === 0) Alert.alert('No results', 'Try a different place name.');
    } catch {
      Alert.alert('Search failed', 'Could not reach location service. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: LocationSearchResult) => {
    const coords = formatCoords(result.latitude, result.longitude);
    applyLocation(
      result.latitude,
      result.longitude,
      coords,
      result.display_name,
      result.water_body_type,
      result.name,
    );
  };

  const handleUseGPS = async () => {
    setUpdatingLocation(true);
    try {
      const loc = await getDeviceLocation();
      if (!loc) {
        Alert.alert('Location unavailable', 'Could not get your current location. Please check that location permission is granted.');
        return;
      }
      const coords = formatCoords(loc.latitude, loc.longitude);
      // Run reverse geocode best-effort.
      let address: string | null = null;
      let wbType: WaterBodyType | null = null;
      let wbName: string | null = null;
      try {
        const geo = await reverseGeocode(loc.latitude, loc.longitude);
        address = geo.location_address;
        wbType = geo.water_body_type;
        wbName = geo.water_body;
      } catch { /* silently ignore */ }
      applyLocation(loc.latitude, loc.longitude, coords, address, wbType, wbName);
    } finally {
      setUpdatingLocation(false);
    }
  };

  const toggleGear = (id: number) => {
    setSelectedGearIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    let uri = photoUri;
    if (uri) uri = await persistPhoto(uri);
    await updateCatch(catchId, {
      photo_uri: uri,
      species: species.trim() || null,
      water_body: waterBody.trim() || null,
      water_body_type: waterBodyType,
      weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
      water_temp_f: waterTempF ? parseFloat(waterTempF) : null,
      notes: notes.trim() || null,
      latitude,
      longitude,
      location_coords: locationCoords,
      location_address: locationAddress,
    });
    await setGearForCatch(catchId, [...selectedGearIds]);
    setSaving(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Photo */}
        <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <Text style={styles.photoPlaceholder}>📷 Change photo</Text>
          )}
        </TouchableOpacity>

        <Field label="Species">
          <TextInput
            style={styles.input}
            value={species}
            onChangeText={setSpecies}
            placeholder="Common name"
            placeholderTextColor={COLORS.textSecondary}
          />
        </Field>
        <Field label="Water body">
          <TextInput
            style={styles.input}
            value={waterBody}
            onChangeText={setWaterBody}
            placeholder="e.g. Green River"
            placeholderTextColor={COLORS.textSecondary}
          />
        </Field>

        {/* Location */}
        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>

          {/* Current location card */}
          {latitude != null && longitude != null && (
            <MapPinWidget
              latitude={latitude}
              longitude={longitude}
              locationCoords={locationCoords}
              locationAddress={locationAddress}
            />
          )}

          {/* Search row */}
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.searchInput]}
              value={locationSearch}
              onChangeText={setLocationSearch}
              placeholder="Search for a place…"
              placeholderTextColor={COLORS.textSecondary}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={[styles.searchBtn, searching && styles.locationBtnDisabled]}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching
                ? <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
                : <Text style={styles.searchBtnText}>Search</Text>}
            </TouchableOpacity>
          </View>

          {/* Search results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsList}>
              {searchResults.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.resultItem, i > 0 && styles.resultItemBorder]}
                  onPress={() => handleSelectResult(r)}
                >
                  <Text style={styles.resultName} numberOfLines={1}>
                    {r.name ?? r.display_name}
                  </Text>
                  <Text style={styles.resultAddress} numberOfLines={1}>
                    {r.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* GPS button */}
          <TouchableOpacity
            style={[styles.locationBtn, updatingLocation && styles.locationBtnDisabled]}
            onPress={handleUseGPS}
            disabled={updatingLocation}
          >
            {updatingLocation
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={styles.locationBtnText}>📍 Use current GPS</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: SPACING.sm }]}>
            <Text style={styles.label}>Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              value={weightLbs}
              onChangeText={setWeightLbs}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Water temp (°F)</Text>
            <TextInput
              style={styles.input}
              value={waterTempF}
              onChangeText={setWaterTempF}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </View>
        <Field label="Notes">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={3}
          />
        </Field>

        {/* Gear */}
        {allGear.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Gear used</Text>
            <View style={styles.gearGrid}>
              {allGear.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.gearChip,
                    selectedGearIds.has(g.id) && styles.gearChipSelected,
                  ]}
                  onPress={() => toggleGear(g.id)}
                >
                  <Text
                    style={[
                      styles.gearChipText,
                      selectedGearIds.has(g.id) && styles.gearChipTextSelected,
                    ]}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md, paddingBottom: 40 },
    photoBtn: { marginBottom: SPACING.md },
    photo: {
      width: '100%',
      height: 200,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surfaceAlt,
    },
    photoPlaceholder: {
      backgroundColor: COLORS.surfaceAlt,
      borderRadius: RADIUS.md,
      padding: SPACING.xl,
      textAlign: 'center',
      color: COLORS.textSecondary,
      fontSize: FONT.md,
    },
    field: { marginBottom: SPACING.md },
    label: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
    input: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
      fontSize: FONT.md,
      color: COLORS.text,
    },
    multiline: { height: 80, textAlignVertical: 'top' },
    row: { flexDirection: 'row' },
    searchRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xs },
    searchInput: { flex: 1, marginBottom: 0 },
    searchBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      justifyContent: 'center',
      minWidth: 70,
      alignItems: 'center',
    },
    searchBtnText: {
      color: COLORS.textOnPrimary,
      fontSize: FONT.sm,
      fontWeight: String(FONT.medium) as any,
    },
    resultsList: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.xs,
      overflow: 'hidden',
    },
    resultItem: { padding: SPACING.sm },
    resultItemBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
    resultName: { fontSize: FONT.sm, color: COLORS.text, fontWeight: '600' },
    resultAddress: { fontSize: FONT.xs ?? FONT.sm, color: COLORS.textSecondary, marginTop: 1 },
    searchRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
    searchInput: { flex: 1, marginBottom: 0 },
    searchBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      justifyContent: 'center',
      minWidth: 72,
      alignItems: 'center',
    },
    searchBtnText: {
      color: COLORS.textOnPrimary,
      fontSize: FONT.sm,
      fontWeight: String(FONT.semibold) as any,
    },
    resultsList: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.sm,
      overflow: 'hidden',
    },
    resultItem: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    resultItemBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
    resultName: { fontSize: FONT.sm, color: COLORS.text, fontWeight: '600' },
    resultAddress: { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 1 },
    locationBtn: {
      borderWidth: 1,
      borderColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      alignItems: 'center',
    },
    locationBtnDisabled: { opacity: 0.5 },
    locationBtnText: {
      fontSize: FONT.sm,
      color: COLORS.primary,
      fontWeight: String(FONT.medium) as any,
    },
    gearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
    gearChip: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    gearChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    gearChipText: { fontSize: FONT.sm, color: COLORS.text },
    gearChipTextSelected: { color: COLORS.textOnPrimary },
    saveBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: {
      color: COLORS.textOnPrimary,
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
    },
  });
}
