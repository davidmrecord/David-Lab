import React, { useEffect, useMemo, useState } from 'react';
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
import { useTheme } from '../theme/ThemeContext';
import { getCatchById, updateCatch, getAllGear, persistPhoto, getGearForCatch, setGearForCatch } from '../db/database';
import { pickPhotoFromLibrary } from '../services/photo';
import MapPinWidget from '../components/MapPinWidget';
import LocationPickerModal from '../components/LocationPickerModal';
import type { LocationResult } from '../components/LocationPickerModal';
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
  const [locationModalVisible, setLocationModalVisible] = useState(false);

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

  const handleLocationConfirm = (result: LocationResult) => {
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setLocationCoords(result.locationCoords);
    setLocationAddress(result.locationAddress);
    setWaterBodyType(result.waterBodyType);
    if (!waterBody.trim() && result.waterBodyName) setWaterBody(result.waterBodyName);
    setLocationModalVisible(false);
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
          {latitude != null && longitude != null && (
            <MapPinWidget
              latitude={latitude}
              longitude={longitude}
              locationCoords={locationCoords}
              locationAddress={locationAddress}
            />
          )}
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={() => setLocationModalVisible(true)}
          >
            <Text style={styles.locationBtnText}>
              {latitude != null ? '📍 Update location' : '📍 Set location'}
            </Text>
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

      <LocationPickerModal
        visible={locationModalVisible}
        initialLatitude={latitude}
        initialLongitude={longitude}
        initialAddress={locationAddress}
        onConfirm={handleLocationConfirm}
        onDismiss={() => setLocationModalVisible(false)}
      />
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
    locationBtn: {
      borderWidth: 1,
      borderColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      alignItems: 'center',
    },
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
