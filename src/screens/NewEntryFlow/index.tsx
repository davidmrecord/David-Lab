import React, { useMemo, useRef, useState } from 'react';
import {
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
import { useTheme } from '../../theme/ThemeContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import {
  createCatch,
  persistPhoto,
  autoCreateTrip,
  getAllTripsWithCatches,
} from '../../db/database';
import { identifyFish } from '../../services/iNaturalist';
import { fetchHistoricalWeather } from '../../services/weather';
import { reverseGeocode } from '../../services/geocoding';
import { pickPhotoFromLibrary, takePhoto } from '../../services/photo';
import TroutLoader from '../../components/TroutLoader';
import OfflineEntryForm from './OfflineEntryForm';
import type { ColorPalette } from '../../theme/palettes';
import type { Trip, SpeciesSuggestion, WaterBodyType } from '../../types';
import { SPACING, RADIUS, FONT } from '../../navigation/theme';
import type { JournalScreenProps } from '../../navigation/AppNavigator';

type Props = JournalScreenProps<'NewEntry'>;
type Step = 'photo' | 'loading' | 'review';

interface ReviewData {
  photoUri: string | null;
  latitude: number | null;
  longitude: number | null;
  caughtAt: string;
  species: string;
  speciesScientific: string;
  speciesConfidence: number | null;
  topSuggestions: SpeciesSuggestion[];
  waterBody: string;
  waterBodyType: WaterBodyType | null;
  weatherTempF: string;
  weatherCondition: string;
  weatherWindMph: string;
  weatherPrecipIn: string;
}

export default function NewEntryFlow({ route, navigation }: Props) {
  const initialTripId = route.params?.tripId;
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { isOffline } = useNetworkStatus();

  const [step, setStep] = useState<Step>('photo');
  const [progress, setProgress] = useState(0);
  const [review, setReview] = useState<ReviewData>({
    photoUri: null,
    latitude: null,
    longitude: null,
    caughtAt: new Date().toISOString(),
    species: '',
    speciesScientific: '',
    speciesConfidence: null,
    topSuggestions: [],
    waterBody: '',
    waterBodyType: null,
    weatherTempF: '',
    weatherCondition: '',
    weatherWindMph: '',
    weatherPrecipIn: '',
  });
  const [weightLbs, setWeightLbs] = useState('');
  const [waterTempF, setWaterTempF] = useState('');
  const [notes, setNotes] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | undefined>(initialTripId);
  const [tripSectionOpen, setTripSectionOpen] = useState(!!initialTripId);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  React.useEffect(() => {
    getAllTripsWithCatches().then(setTrips);
  }, []);

  // If offline, skip straight to the offline form
  if (isOffline) {
    return (
      <OfflineEntryForm
        initialTripId={initialTripId}
        onSaved={() => navigation.goBack()}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Photo step
  // ---------------------------------------------------------------------------

  const handlePhotoChoice = async (source: 'camera' | 'library' | 'skip') => {
    if (source === 'skip') {
      setReview(r => ({ ...r, caughtAt: new Date().toISOString() }));
      setStep('review');
      setTripSectionOpen(false);
      return;
    }

    if (picking) return;
    setPicking(true);

    let result;
    try {
      result = source === 'camera' ? await takePhoto() : await pickPhotoFromLibrary();
    } catch (err) {
      Alert.alert('Error', 'Could not open photo picker. Please try again.');
      setPicking(false);
      return;
    } finally {
      setPicking(false);
    }

    if (!result) return;

    const photoUri = result.uri;
    const latitude = result.latitude;
    const longitude = result.longitude;
    const caughtAt = result.datetime ?? new Date().toISOString();

    setReview(r => ({ ...r, photoUri, latitude, longitude, caughtAt }));
    setStep('loading');
    setTripSectionOpen(true);
    setProgress(0);

    // Run all three API calls in parallel.
    // identifyFish only needs the photo URI — do not gate it on GPS.
    // Weather and geocoding require coordinates.
    const [fishResult, weatherResult, geoResult] = await Promise.allSettled([
      identifyFish(photoUri).finally(() => setProgress(p => p + 0.34)),
      latitude && longitude
        ? fetchHistoricalWeather(latitude, longitude, caughtAt).finally(() =>
            setProgress(p => p + 0.33)
          )
        : Promise.resolve(null).then(v => { setProgress(p => p + 0.33); return v; }),
      latitude && longitude
        ? reverseGeocode(latitude, longitude).finally(() => setProgress(p => p + 0.33))
        : Promise.resolve(null).then(v => { setProgress(p => p + 0.33); return v; }),
    ]);

    const fish = fishResult.status === 'fulfilled' ? fishResult.value : null;
    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    const geo = geoResult.status === 'fulfilled' ? geoResult.value : null;

    // DEBUG: dump raw API results into notes so we can see what came back
    const debugNote = [
      `lat=${latitude ?? 'null'} lng=${longitude ?? 'null'}`,
      `fish: ${fishResult.status} | ${JSON.stringify(fish)}`,
      `geo: ${geoResult.status} | ${JSON.stringify(geo)}`,
      `weather: ${weatherResult.status} | ${JSON.stringify(weather)}`,
    ].join('\n');
    setNotes(debugNote);

    setReview(r => ({
      ...r,
      photoUri,
      latitude,
      longitude,
      caughtAt,
      species: fish?.topSuggestion?.common_name ?? '',
      speciesScientific: fish?.topSuggestion?.scientific_name ?? '',
      speciesConfidence: fish?.topSuggestion?.confidence ?? null,
      topSuggestions: fish?.suggestions ?? [],
      waterBody: geo?.water_body ?? '',
      waterBodyType: geo?.water_body_type ?? null,
      weatherTempF: weather?.temp_f != null ? String(Math.round(weather.temp_f)) : '',
      weatherCondition: weather?.condition ?? '',
      weatherWindMph: weather?.wind_mph != null ? String(Math.round(weather.wind_mph)) : '',
      weatherPrecipIn: weather?.precipitation_in != null
        ? weather.precipitation_in.toFixed(2)
        : '',
    }));

    setStep('review');
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setSaving(true);
    try {
      let photoUri = review.photoUri;
      if (photoUri) photoUri = await persistPhoto(photoUri);

      let tid = selectedTripId;
      if (!tid) {
        tid = await autoCreateTrip(review.waterBody || null, review.caughtAt);
      }

      await createCatch({
        trip_id: tid,
        photo_uri: photoUri,
        species: review.species.trim() || null,
        species_scientific: review.speciesScientific || null,
        species_confidence: review.speciesConfidence,
        caught_at: review.caughtAt,
        latitude: review.latitude,
        longitude: review.longitude,
        water_body: review.waterBody.trim() || null,
        water_body_type: review.waterBodyType,
        weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
        water_temp_f: waterTempF ? parseFloat(waterTempF) : null,
        notes: notes.trim() || null,
        weather_temp_f: review.weatherTempF ? parseFloat(review.weatherTempF) : null,
        weather_condition: review.weatherCondition || null,
        weather_wind_mph: review.weatherWindMph ? parseFloat(review.weatherWindMph) : null,
        weather_precipitation_in: review.weatherPrecipIn
          ? parseFloat(review.weatherPrecipIn)
          : null,
        needs_sync: 0,
        synced_at: new Date().toISOString(),
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save catch.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (step === 'photo') {
    return (
      <View style={styles.center}>
        <Text style={styles.stepTitle}>Log a catch</Text>
        <TouchableOpacity
          style={[styles.bigBtn, picking && { opacity: 0.5 }]}
          onPress={() => handlePhotoChoice('camera')}
          disabled={picking}
        >
          <Text style={styles.bigBtnIcon}>📷</Text>
          <Text style={styles.bigBtnText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bigBtn, picking && { opacity: 0.5 }]}
          onPress={() => handlePhotoChoice('library')}
          disabled={picking}
        >
          <Text style={styles.bigBtnIcon}>🖼</Text>
          <Text style={styles.bigBtnText}>
            {picking ? 'Opening…' : 'Choose from Library'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => handlePhotoChoice('skip')}
          disabled={picking}
        >
          <Text style={styles.skipBtnText}>Skip — enter manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'loading') {
    return (
      <View style={styles.center}>
        <TroutLoader progress={progress} size={140} />
        <Text style={styles.loadingText}>Identifying fish & fetching conditions…</Text>
        <Text style={styles.loadingSubtext}>{Math.round(progress * 100)}%</Text>
      </View>
    );
  }

  // Review step
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {review.photoUri && (
          <Image source={{ uri: review.photoUri }} style={styles.photo} />
        )}

        <Field label="Species" COLORS={COLORS} styles={styles}>
          <TextInput
            style={styles.input}
            value={review.species}
            onChangeText={v => setReview(r => ({ ...r, species: v }))}
            placeholder="Common name"
            placeholderTextColor={COLORS.textSecondary}
          />
          {review.speciesConfidence != null && (
            <Text style={styles.hint}>
              {Math.round(review.speciesConfidence * 100)}% confidence · {review.speciesScientific}
            </Text>
          )}
        </Field>

        <Field label="Water body" COLORS={COLORS} styles={styles}>
          <TextInput
            style={styles.input}
            value={review.waterBody}
            onChangeText={v => setReview(r => ({ ...r, waterBody: v }))}
            placeholder="e.g. Green River"
            placeholderTextColor={COLORS.textSecondary}
          />
        </Field>

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

        {/* Weather summary (read-only from API) */}
        {review.weatherCondition !== '' && (
          <View style={styles.weatherRow}>
            <Text style={styles.weatherText}>
              {review.weatherCondition}
              {review.weatherTempF ? ` · ${review.weatherTempF}°F` : ''}
              {review.weatherWindMph ? ` · ${review.weatherWindMph} mph` : ''}
            </Text>
          </View>
        )}

        <Field label="Notes" COLORS={COLORS} styles={styles}>
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

        {/* Trip section (collapsible) */}
        <TouchableOpacity
          style={styles.tripToggle}
          onPress={() => setTripSectionOpen(o => !o)}
        >
          <Text style={styles.tripToggleText}>
            {tripSectionOpen ? '▾' : '▸'} Trip
          </Text>
          {selectedTripId && (
            <Text style={styles.tripSelectedLabel}>
              {trips.find(t => t.id === selectedTripId)?.title}
            </Text>
          )}
        </TouchableOpacity>
        {tripSectionOpen && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripScroll}>
            {trips.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tripChip,
                  selectedTripId === t.id && styles.tripChipSelected,
                ]}
                onPress={() => setSelectedTripId(selectedTripId === t.id ? undefined : t.id)}
              >
                <Text
                  style={[
                    styles.tripChipText,
                    selectedTripId === t.id && styles.tripChipTextSelected,
                  ]}
                >
                  {t.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Catch'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  children,
  COLORS,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  COLORS: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
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
    center: {
      flex: 1,
      backgroundColor: COLORS.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.xl,
    },
    stepTitle: {
      fontSize: FONT.xxl,
      fontWeight: String(FONT.bold) as any,
      color: COLORS.text,
      marginBottom: SPACING.xl,
    },
    bigBtn: {
      width: '100%',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.xl,
      alignItems: 'center',
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    bigBtnIcon: { fontSize: 36, marginBottom: SPACING.sm },
    bigBtnText: {
      fontSize: FONT.lg,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.text,
    },
    skipBtn: { marginTop: SPACING.md },
    skipBtnText: { fontSize: FONT.md, color: COLORS.textSecondary },
    loadingText: {
      fontSize: FONT.md,
      color: COLORS.textSecondary,
      marginTop: SPACING.xl,
      textAlign: 'center',
    },
    loadingSubtext: {
      fontSize: FONT.sm,
      color: COLORS.primary,
      marginTop: SPACING.xs,
      fontWeight: String(FONT.semibold) as any,
    },
    photo: {
      width: '100%',
      height: 220,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surfaceAlt,
      marginBottom: SPACING.md,
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
    hint: { fontSize: 11, color: COLORS.textSecondary, marginTop: SPACING.xs },
    row: { flexDirection: 'row' },
    weatherRow: {
      backgroundColor: COLORS.surfaceAlt,
      borderRadius: RADIUS.sm,
      padding: SPACING.sm,
      marginBottom: SPACING.md,
    },
    weatherText: { fontSize: FONT.sm, color: COLORS.textSecondary },
    tripToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.xs,
    },
    tripToggleText: {
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.text,
      marginRight: SPACING.sm,
    },
    tripSelectedLabel: { fontSize: FONT.sm, color: COLORS.primary },
    tripScroll: { marginBottom: SPACING.md },
    tripChip: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      marginRight: SPACING.xs,
    },
    tripChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tripChipText: { fontSize: FONT.sm, color: COLORS.text },
    tripChipTextSelected: { color: COLORS.textOnPrimary },
    saveBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    saveBtnText: {
      color: COLORS.textOnPrimary,
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
    },
  });
}
