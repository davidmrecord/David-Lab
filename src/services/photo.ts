import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

export interface PhotoResult {
  uri: string;
  latitude: number | null;
  longitude: number | null;
  datetime: string | null; // ISO 8601
}

export async function pickPhotoFromLibrary(): Promise<PhotoResult | null> {
  const [mediaLib, imagePicker] = await Promise.all([
    MediaLibrary.requestPermissionsAsync(),
    ImagePicker.requestMediaLibraryPermissionsAsync(),
  ]);
  if (mediaLib.status !== 'granted' && imagePicker.status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    exif: true,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return extractAssetData(result.assets[0]);
}

export async function takePhoto(): Promise<PhotoResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.85,
    exif: true,
  });

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
      latitude = toDecimalDegrees(exif.GPSLatitude, exif.GPSLatitudeRef ?? 'N');
      longitude = toDecimalDegrees(exif.GPSLongitude, exif.GPSLongitudeRef ?? 'E');
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
