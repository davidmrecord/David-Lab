import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatCoords, searchLocations, reverseGeocode } from '../services/geocoding';
import { getDeviceLocation } from '../services/photo';
import type { LocationSearchResult } from '../services/geocoding';
import type { WaterBodyType } from '../types';
import type { ColorPalette } from '../theme/palettes';
import { FONT, RADIUS, SPACING } from '../navigation/theme';

export interface LocationResult {
  latitude: number;
  longitude: number;
  locationCoords: string;
  locationAddress: string | null;
  waterBodyType: WaterBodyType | null;
  waterBodyName: string | null;
}

interface Props {
  visible: boolean;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialAddress?: string | null;
  onConfirm: (result: LocationResult) => void;
  onDismiss: () => void;
}

export default function LocationPickerModal({
  visible,
  initialLatitude,
  initialLongitude,
  initialAddress,
  onConfirm,
  onDismiss,
}: Props) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLon, setPickedLon] = useState<number | null>(null);
  const [pickedAddress, setPickedAddress] = useState<string | null>(null);
  const [pickedWbType, setPickedWbType] = useState<WaterBodyType | null>(null);
  const [pickedWbName, setPickedWbName] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Sync initial values each time the modal opens
  useEffect(() => {
    if (visible) {
      setPickedLat(initialLatitude ?? null);
      setPickedLon(initialLongitude ?? null);
      setPickedAddress(initialAddress ?? null);
      setPickedWbType(null);
      setPickedWbName(null);
      setQuery('');
      setSearchResults([]);
      setMapError(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const mapUri =
    pickedLat != null && pickedLon != null && !mapError
      ? `https://staticmap.openstreetmap.de/staticmap.php?center=${pickedLat},${pickedLon}&zoom=13&size=600x300&markers=${pickedLat},${pickedLon},red-pushpin`
      : null;

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const results = await searchLocations(q);
      setSearchResults(results);
      if (results.length === 0) {
        Alert.alert('No results', 'No places found. Check the spelling — for example, "Greenbrier" not "Greenbriar".');
      }
    } catch {
      Alert.alert('Search failed', 'Could not reach location service. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: LocationSearchResult) => {
    setPickedLat(result.latitude);
    setPickedLon(result.longitude);
    setPickedAddress(result.display_name);
    setPickedWbType(result.water_body_type);
    setPickedWbName(result.name);
    setSearchResults([]);
    setQuery('');
    setMapError(false);
  };

  const handleGPS = async () => {
    setGpsLoading(true);
    try {
      const loc = await getDeviceLocation();
      if (!loc) {
        Alert.alert('Location unavailable', 'Could not get your location. Check that location permission is granted.');
        return;
      }
      let address: string | null = null;
      let wbType: WaterBodyType | null = null;
      let wbName: string | null = null;
      try {
        const geo = await reverseGeocode(loc.latitude, loc.longitude);
        address = geo.location_address;
        wbType = geo.water_body_type;
        wbName = geo.water_body;
      } catch { /* silently ignore */ }
      setPickedLat(loc.latitude);
      setPickedLon(loc.longitude);
      setPickedAddress(address);
      setPickedWbType(wbType);
      setPickedWbName(wbName);
      setSearchResults([]);
      setMapError(false);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (pickedLat == null || pickedLon == null) return;
    onConfirm({
      latitude: pickedLat,
      longitude: pickedLon,
      locationCoords: formatCoords(pickedLat, pickedLon),
      locationAddress: pickedAddress,
      waterBodyType: pickedWbType,
      waterBodyName: pickedWbName,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Location</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={pickedLat == null}
            style={styles.headerBtn}
          >
            <Text style={[styles.confirmText, pickedLat == null && styles.confirmDisabled]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Map preview */}
          {mapUri ? (
            <Image
              source={{ uri: mapUri }}
              style={styles.map}
              resizeMode="cover"
              onError={() => setMapError(true)}
            />
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>
                {pickedLat != null ? '📍 Location selected' : 'No location selected'}
              </Text>
            </View>
          )}

          {/* Location info below map */}
          {pickedLat != null && pickedLon != null && (
            <View style={styles.locationInfo}>
              <Text style={styles.coordText}>{formatCoords(pickedLat, pickedLon)}</Text>
              {pickedAddress ? (
                <Text style={styles.addressText} numberOfLines={3}>
                  {pickedAddress}
                </Text>
              ) : null}
            </View>
          )}

          <View style={styles.divider} />

          {/* Search row */}
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.searchInput]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search for a place…"
              placeholderTextColor={COLORS.textSecondary}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.searchBtn, searching && styles.btnDisabled]}
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
                  style={[styles.resultItem, i > 0 && styles.resultBorder]}
                  onPress={() => handleSelectResult(r)}
                >
                  <Text style={styles.resultName} numberOfLines={1}>
                    {r.name ?? r.display_name}
                  </Text>
                  <Text style={styles.resultAddr} numberOfLines={2}>
                    {r.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* GPS button */}
          <TouchableOpacity
            style={[styles.gpsBtn, gpsLoading && styles.btnDisabled]}
            onPress={handleGPS}
            disabled={gpsLoading}
          >
            {gpsLoading
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={styles.gpsBtnText}>📍 Use current GPS location</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    headerBtn: { minWidth: 64 },
    headerTitle: {
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.text,
    },
    cancelText: {
      fontSize: FONT.md,
      color: COLORS.textSecondary,
    },
    confirmText: {
      fontSize: FONT.md,
      color: COLORS.primary,
      fontWeight: String(FONT.semibold) as any,
      textAlign: 'right',
    },
    confirmDisabled: { opacity: 0.35 },
    scroll: { paddingBottom: SPACING.xl },
    map: {
      width: '100%',
      height: 220,
      backgroundColor: COLORS.surfaceAlt,
    },
    mapPlaceholder: {
      height: 160,
      backgroundColor: COLORS.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapPlaceholderText: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
    },
    locationInfo: {
      padding: SPACING.md,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    coordText: {
      fontSize: FONT.sm,
      fontWeight: '600',
      color: COLORS.text,
    },
    addressText: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    divider: { height: SPACING.md },
    searchRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
    },
    input: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
      fontSize: FONT.md,
      color: COLORS.text,
    },
    searchInput: { flex: 1 },
    searchBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 72,
    },
    searchBtnText: {
      color: COLORS.textOnPrimary,
      fontSize: FONT.sm,
      fontWeight: String(FONT.semibold) as any,
    },
    btnDisabled: { opacity: 0.5 },
    resultsList: {
      marginHorizontal: SPACING.md,
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
    resultBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
    resultName: { fontSize: FONT.sm, color: COLORS.text, fontWeight: '600' },
    resultAddr: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
    gpsBtn: {
      marginHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      alignItems: 'center',
    },
    gpsBtnText: {
      fontSize: FONT.sm,
      color: COLORS.primary,
      fontWeight: String(FONT.medium) as any,
    },
  });
}
