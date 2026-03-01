import React, { useMemo, useState } from 'react';
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
import { createCatch, persistPhoto, autoCreateTrip, getAllTripsWithCatches } from '../../db/database';
import { pickPhotoFromLibrary, takePhoto } from '../../services/photo';
import { formatCoords } from '../../services/geocoding';
import type { ColorPalette } from '../../theme/palettes';
import type { Trip } from '../../types';
import { SPACING, RADIUS, FONT } from '../../navigation/theme';

interface Props {
  initialTripId?: number;
  onSaved: () => void;
}

export default function OfflineEntryForm({ initialTripId, onSaved }: Props) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationCoords, setLocationCoords] = useState<string | null>(null);
  const [species, setSpecies] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [waterTempF, setWaterTempF] = useState('');
  const [notes, setNotes] = useState('');
  const [tripId, setTripId] = useState<number | undefined>(initialTripId);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    getAllTripsWithCatches().then(setTrips);
  }, []);

  const handlePhoto = async (source: 'camera' | 'library') => {
    const result = source === 'camera' ? await takePhoto() : await pickPhotoFromLibrary();
    if (result) {
      setPhotoUri(result.uri);
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      if (result.latitude != null && result.longitude != null) {
        setLocationCoords(formatCoords(result.latitude, result.longitude));
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let uri = photoUri;
      if (uri) uri = await persistPhoto(uri);

      let tid = tripId;
      if (!tid) {
        tid = await autoCreateTrip(null, new Date().toISOString());
      }

      await createCatch({
        trip_id: tid,
        photo_uri: uri,
        species: species.trim() || null,
        species_scientific: null,
        species_confidence: null,
        caught_at: new Date().toISOString(),
        latitude,
        longitude,
        water_body: null,
        water_body_type: null,
        weight_lbs: weightLbs ? parseFloat(weightLbs) : null,
        water_temp_f: waterTempF ? parseFloat(waterTempF) : null,
        notes: notes.trim() || null,
        weather_temp_f: null,
        weather_condition: null,
        weather_wind_mph: null,
        weather_precipitation_in: null,
        location_coords: locationCoords,
        location_address: null, // filled on sync
        needs_sync: 1,
        synced_at: null,
      });
      onSaved();
    } catch (err) {
      Alert.alert('Error', 'Failed to save catch. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            📵 Offline — catch will sync when you reconnect
          </Text>
        </View>

        {/* Photo */}
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => handlePhoto('camera')}>
              <Text style={styles.photoBtnText}>📷 Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => handlePhoto('library')}>
              <Text style={styles.photoBtnText}>🖼 Library</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Species</Text>
          <TextInput
            style={styles.input}
            value={species}
            onChangeText={setSpecies}
            placeholder="Common name"
            placeholderTextColor={COLORS.textSecondary}
          />
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

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Trip picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Trip</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trips.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tripChip, tripId === t.id && styles.tripChipSelected]}
                onPress={() => setTripId(tripId === t.id ? undefined : t.id)}
              >
                <Text style={[
                  styles.tripChipText,
                  tripId === t.id && styles.tripChipTextSelected,
                ]}>
                  {t.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md, paddingBottom: 40 },
    offlineBanner: {
      backgroundColor: COLORS.warning,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    offlineBannerText: { color: '#fff', fontWeight: String(FONT.medium) as any, fontSize: FONT.sm },
    photo: {
      width: '100%',
      height: 200,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surfaceAlt,
      marginBottom: SPACING.md,
    },
    photoRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    photoBtn: {
      flex: 1,
      backgroundColor: COLORS.surfaceAlt,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      alignItems: 'center',
    },
    photoBtnText: { fontSize: FONT.md, color: COLORS.text },
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
    },
    saveBtnText: {
      color: COLORS.textOnPrimary,
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
    },
  });
}
