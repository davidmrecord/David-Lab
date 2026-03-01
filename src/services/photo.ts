import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
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

  // On Android, EXIF GPS is often stripped from Google Photos / cloud assets.
  // Fall back to MediaLibrary.getAssetInfoAsync() which uses ACCESS_MEDIA_LOCATION.
  if (Platform.OS === 'android' && photoResult.latitude === null && asset.assetId) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
      if (info.location) {
        photoResult.latitude = info.location.latitude;
        photoResult.longitude = info.location.longitude;
      }
    } catch {
      // Location enrichment is best-effort; silently ignore.
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
  return extractAssetData(result.assets[0]);
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
  let decimal: number;
  if (Array.isArray(value)) {
    decimal = value[0] + value[1] / 60 + value[2] / 3600;
  } else {
    decimal = value;
  }
  return ref === 'S' || ref === 'W' ? -decimal : decimal;
}
