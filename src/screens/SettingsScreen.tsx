import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getSetting, setSetting, persistPhoto } from '../db/database';
import { pickPhotoFromLibrary } from '../services/photo';
import { PALETTES } from '../theme/palettes';
import type { ColorPalette } from '../theme/palettes';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

const BUILD_ID = 'v0.2.11 · 2026-02-27 build 3';

type Props = JournalScreenProps<'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { colors: COLORS, themeName, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    getSetting('avatar_uri').then(v => setAvatarUri(v));
  }, []);

  const handlePickAvatar = async () => {
    const result = await pickPhotoFromLibrary();
    if (!result) return;
    const uri = await persistPhoto(result.uri);
    await setSetting('avatar_uri', uri);
    setAvatarUri(uri);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <TouchableOpacity style={styles.avatarRow} onPress={handlePickAvatar}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={{ fontSize: 32 }}>⚙️</Text>
          </View>
        )}
        <Text style={styles.avatarLabel}>Change profile photo</Text>
      </TouchableOpacity>

      {/* Theme */}
      <Text style={styles.sectionTitle}>Theme</Text>
      <View style={styles.paletteGrid}>
        {Object.values(PALETTES).map(palette => (
          <PaletteCard
            key={palette.name}
            palette={palette}
            selected={themeName === palette.name}
            onPress={() => setTheme(palette.name)}
          />
        ))}
      </View>

      <Text style={styles.buildId}>{BUILD_ID}</Text>
    </ScrollView>
  );
}

function PaletteCard({
  palette,
  selected,
  onPress,
}: {
  palette: ColorPalette;
  selected: boolean;
  onPress: () => void;
}) {
  // Preview card showing exactly how a trip card will look
  return (
    <Pressable
      onPress={onPress}
      style={[
        previewStyles.card,
        { backgroundColor: palette.surface, borderColor: selected ? palette.primary : palette.border },
        selected && { borderWidth: 2 },
      ]}
    >
      <View style={[previewStyles.header, { backgroundColor: palette.primary }]}>
        <Text style={[previewStyles.headerText, { color: palette.textOnPrimary }]}>
          {palette.name}
        </Text>
        {selected && (
          <Text style={[previewStyles.check, { color: palette.textOnPrimary }]}>✓</Text>
        )}
      </View>
      <View style={previewStyles.body}>
        <Text style={[previewStyles.title, { color: palette.text }]}>Green River · May 14</Text>
        <Text style={[previewStyles.meta, { color: palette.textSecondary }]}>3 catches</Text>
        <View style={[previewStyles.badge, { backgroundColor: palette.badge }]}>
          <Text style={[previewStyles.badgeText, { color: palette.badgeText }]}>
            🔄 2 pending
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const previewStyles = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  header: { padding: SPACING.sm, flexDirection: 'row', justifyContent: 'space-between' },
  headerText: { fontWeight: '600', fontSize: FONT.md },
  check: { fontSize: FONT.md },
  body: { padding: SPACING.sm },
  title: { fontSize: FONT.sm, fontWeight: '500', marginBottom: 2 },
  meta: { fontSize: 11, marginBottom: SPACING.xs },
  badge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '500' },
});

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md },
    sectionTitle: {
      fontSize: FONT.sm,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: SPACING.md,
      marginTop: SPACING.md,
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.md,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.surfaceAlt,
    },
    avatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLabel: {
      fontSize: FONT.md,
      color: COLORS.primary,
      marginLeft: SPACING.md,
      fontWeight: String(FONT.medium) as any,
    },
    paletteGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    buildId: {
      fontSize: 11,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginTop: SPACING.xl,
      marginBottom: SPACING.md,
      opacity: 0.5,
    },
  });
}
