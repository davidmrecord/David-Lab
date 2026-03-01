import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { formatCoords } from '../services/geocoding';
import type { ColorPalette } from '../theme/palettes';
import { FONT, RADIUS, SPACING } from '../navigation/theme';

interface Props {
  latitude: number;
  longitude: number;
  locationCoords?: string | null;
  locationAddress?: string | null;
}

export default function MapPinWidget({
  latitude,
  longitude,
  locationCoords,
  locationAddress,
}: Props) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const coordLabel = locationCoords ?? formatCoords(latitude, longitude);

  return (
    <View style={styles.card}>
      <View style={styles.iconCol}>
        <Svg width={20} height={27} viewBox="0 0 28 38">
          <Path
            d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0Z"
            fill={COLORS.primary}
          />
          <Circle cx="14" cy="14" r="6" fill="white" />
        </Svg>
      </View>
      <View style={styles.textCol}>
        <Text style={styles.coordText}>{coordLabel}</Text>
        {locationAddress ? (
          <Text style={styles.addressText} numberOfLines={2}>
            {locationAddress}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: COLORS.surfaceAlt,
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      marginBottom: SPACING.sm,
      gap: SPACING.sm,
    },
    iconCol: { paddingTop: 1 },
    textCol: { flex: 1 },
    coordText: {
      fontSize: FONT.sm,
      color: COLORS.text,
      fontWeight: '600',
    },
    addressText: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
  });
}
