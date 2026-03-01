import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export interface PhotoResult {
  uri: string;
  latitude: number | null;
  longitude: number | null;
  datetime: string | null; // ISO 8601
}

export async function pickPhotoFromLibrary(): Promise<PhotoResult | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    const message = Platform.OS === 'ios'
      ? 'Please go to Settings → Expo Go → Photos and allow access.'
      : 'Please go to Settings → Apps → Expo Go → Permissions → Photos and videos.';
    Alert.alert('Photo Access Required', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
    return null;
  }

  let result;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      exif: true,
      allowsEditing: false,
    });
  } catch (err) {
    Alert.alert('Error', 'Could not open photo library. Please try again.');
    return null;
  }

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const photoResult = extractAssetData(asset);

  // EXIF GPS is often stripped from Google Photos / cloud assets on both platforms.
  // Fall back to MediaLibrary.getAssetInfoAsync() which reads it from the asset
  // metadata (ACCESS_MEDIA_LOCATION on Android, PHAsset on iOS).
  if (photoResult.latitude === null && asset.assetId) {
    try {
      await MediaLibrary.requestPermissionsAsync();
      const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
      if (info.location) {
        const { latitude, longitude } = info.location;
        // Guard against devices returning {latitude:0, longitude:0} as a default.
        if (latitude !== 0 || longitude !== 0) {
          photoResult.latitude = latitude;
          photoResult.longitude = longitude;
        }
      }
    } catch {
      // Location enrichment is best-effort; silently ignore.
    }
  }

  // Final fallback: Android 14+ Google Photos cloud assets frequently have no
  // accessible GPS metadata at all. Use the current device location so that a
  // fresh catch logged at the spot gets coordinates even when picking from the
  // library instead of using the in-app camera.
  if (photoResult.latitude === null) {
    const deviceLoc = await getDeviceLocation();
    if (deviceLoc) {
      photoResult.latitude = deviceLoc.latitude;
      photoResult.longitude = deviceLoc.longitude;
    }
  }

  return photoResult;
}

export async function takePhoto(): Promise<PhotoResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    const message = Platform.OS === 'ios'
      ? 'Please go to Settings → Expo Go → Camera and allow access.'
      : 'Please go to Settings → Apps → Expo Go → Permissions → Camera.';
    Alert.alert('Camera Access Required', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
    return null;
  }

  // Get device GPS now — the user is at the fishing spot.
  // This is more reliable than EXIF for camera captures in Expo Go.
  const deviceLocation = await getDeviceLocation();

  let result;
  try {
    result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      exif: true,
    });
  } catch (err) {
    Alert.alert('Error', 'Could not open camera. Please try again.');
    return null;
  }

  if (result.canceled || !result.assets?.[0]) return null;

  const photoResult = extractAssetData(result.assets[0]);

  // Prefer EXIF GPS (most accurate); fall back to device location acquired above.
  if (photoResult.latitude === null && deviceLocation) {
    photoResult.latitude = deviceLocation.latitude;
    photoResult.longitude = deviceLocation.longitude;
  }

  return photoResult;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Request foreground location permission and return the most recent known
 * position. Uses getLastKnownPositionAsync (instant) then falls back to
 * getCurrentPositionAsync with a 5-second timeout to avoid blocking the UI.
 */
async function getDeviceLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    // Try the cached position first — instant and usually fresh enough.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude };

    // Fall back to a fresh fix with a 5-second timeout.
    const fresh = await Promise.race<Location.LocationObject | null>([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)),
    ]);
    if (fresh) return { latitude: fresh.coords.latitude, longitude: fresh.coords.longitude };
  } catch {
    // Location is best-effort — never block the camera launch.
  }
  return null;
}

function extractAssetData(asset: ImagePicker.ImagePickerAsset): PhotoResult {
  const exif = asset.exif as Record<string, any> | undefined;
  let latitude: number | null = null;
  let longitude: number | null = null;
  let datetime: string | null = null;

  if (exif) {
    if (exif.GPSLatitude != null && exif.GPSLongitude != null) {
      const lat = toDecimalDegrees(exif.GPSLatitude, exif.GPSLatitudeRef ?? 'N');
      const lon = toDecimalDegrees(exif.GPSLongitude, exif.GPSLongitudeRef ?? 'E');
      // Guard against Android returning 0,0 when GPS is unavailable (instead of null).
      if (lat !== 0 || lon !== 0) {
        latitude = lat;
        longitude = lon;
      }
    }
    if (exif.DateTimeOriginal) {
      // EXIF format: "YYYY:MM:DD HH:MM:SS"
      datetime = exif.DateTimeOriginal.replace(
        /^(\d{4}):(\d{2}):(\d{2})/,
        '$1-$2-$3'
      );
    }
  }

  return {
    uri: asset.uri,
    latitude,
    longitude,
    datetime: datetime ?? new Date().toISOString(),
  };
}

function toDecimalDegrees(value: number | number[], ref: string): number {
  if (Array.isArray(value)) {
    // Standard EXIF DMS: values are always unsigned; ref gives the hemisphere.
    const decimal = value[0] + value[1] / 60 + value[2] / 3600;
    return ref === 'S' || ref === 'W' ? -decimal : decimal;
  }
  // Scalar path: some EXIF parsers (Android) return pre-signed decimal degrees.
  // If already negative, trust the sign — applying the ref would double-negate it.
  if (value < 0) return value;
  return ref === 'S' || ref === 'W' ? -value : value;
}
