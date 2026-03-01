import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/palettes';
import { FONT, RADIUS, SPACING } from '../navigation/theme';

interface Props {
  latitude: number;
  longitude: number;
  locationCoords?: string | null;
  locationAddress?: string | null;
}

// OSM tile zoom level — 14 ≈ 2.5 km per tile at mid-latitudes, good fishing context.
const ZOOM = 14;
const TILE_PX = 256;
const MAP_H = 160;

// Returns the tile indices and fractional position of lat/lon within that tile.
function tileInfo(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  const worldX = ((lon + 180) / 360) * TILE_PX * n;
  const worldY =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    TILE_PX *
    n;
  const tileX = Math.floor(worldX / TILE_PX);
  const tileY = Math.floor(worldY / TILE_PX);
  const fracX = worldX / TILE_PX - tileX; // 0..1 within tile
  const fracY = worldY / TILE_PX - tileY; // 0..1 within tile
  return { tileX, tileY, fracX, fracY };
}

const PIN_W = 28;
const PIN_H = 38;

export default function MapPinWidget({
  latitude,
  longitude,
  locationCoords,
  locationAddress,
}: Props) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [expanded, setExpanded] = useState(true);
  const [mapWidth, setMapWidth] = useState(0);

  const { tileX, tileY, fracX, fracY } = useMemo(
    () => tileInfo(latitude, longitude, ZOOM),
    [latitude, longitude],
  );

  const tileUrl = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${ZOOM}/${tileX}/${tileY}.png`;

  // Pin tip lands at (fracX * mapWidth, fracY * MAP_H).
  // The SVG pin is PIN_W × PIN_H with its tip at bottom-centre.
  const pinLeft = mapWidth > 0 ? fracX * mapWidth - PIN_W / 2 : 0;
  const pinTop = fracY * MAP_H - PIN_H;

  const hasText = locationCoords || locationAddress;

  return (
    <View style={styles.container}>
      {/* Map tile — stretched to fill exactly so pin-position maths is precise */}
      <View
        style={styles.mapWrapper}
        onLayout={e => setMapWidth(e.nativeEvent.layout.width)}
      >
        <Image
          source={{ uri: tileUrl }}
          style={styles.mapImage}
          resizeMode="stretch"
        />
        {mapWidth > 0 && (
          <View
            pointerEvents="none"
            style={[styles.pin, { left: pinLeft, top: pinTop }]}
          >
            <Svg width={PIN_W} height={PIN_H} viewBox="0 0 28 38">
              {/* Teardrop pin body */}
              <Path
                d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0Z"
                fill={COLORS.primary}
              />
              {/* White inner dot */}
              <Circle cx="14" cy="14" r="6" fill="white" />
            </Svg>
          </View>
        )}
        <Text style={styles.attribution}>© OpenStreetMap · © CARTO</Text>
      </View>

      {/* Collapsible location text */}
      {hasText && (
        <>
          <TouchableOpacity
            style={styles.toggle}
            onPress={() => setExpanded(e => !e)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {expanded ? '▾' : '▸'} Location
            </Text>
          </TouchableOpacity>
          {expanded && (
            <View style={styles.textBlock}>
              {locationCoords ? (
                <Text style={styles.coordText}>📍 {locationCoords}</Text>
              ) : null}
              {locationAddress ? (
                <Text style={styles.addressText}>{locationAddress}</Text>
              ) : null}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { marginBottom: SPACING.md },
    mapWrapper: {
      height: MAP_H,
      borderRadius: RADIUS.md,
      overflow: 'hidden',
      backgroundColor: COLORS.surfaceAlt,
    },
    mapImage: { width: '100%', height: MAP_H },
    pin: { position: 'absolute' },
    attribution: {
      position: 'absolute',
      bottom: 4,
      right: 6,
      fontSize: 9,
      color: '#333',
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: 3,
      paddingVertical: 1,
      borderRadius: 2,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.xs,
    },
    toggleText: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      fontWeight: '600',
    },
    textBlock: { paddingBottom: SPACING.xs },
    coordText: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
    },
    addressText: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
  });
}
