import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getSetting, setSetting, persistPhoto } from '../db/database';
import { pickPhotoFromLibrary } from '../services/photo';
import {
  saveToken,
  clearToken,
  getTokenStatus,
} from '../services/iNaturalistAuth';
import { PALETTES } from '../theme/palettes';
import type { ColorPalette } from '../theme/palettes';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

const BUILD_ID = 'v0.2.14 · 2026-02-27 build 6';

type Props = JournalScreenProps<'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { colors: COLORS, themeName, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // iNaturalist token state
  const [inatSaved, setInatSaved] = useState(false);
  const [inatExpired, setInatExpired] = useState(false);
  const [inatTokenInput, setInatTokenInput] = useState('');

  const refreshInatStatus = useCallback(async () => {
    const status = await getTokenStatus();
    setInatSaved(status.saved);
    setInatExpired(status.expired);
  }, []);

  useEffect(() => {
    getSetting('avatar_uri').then(v => setAvatarUri(v));
    refreshInatStatus();
  }, [refreshInatStatus]);

  const handleSaveToken = async () => {
    const trimmed = inatTokenInput.trim();
    if (!trimmed) return;
    try {
      await saveToken(trimmed);
      setInatTokenInput('');
      await refreshInatStatus();
    } catch (e: any) {
      Alert.alert('Invalid token', e.message ?? 'Could not save token.');
    }
  };

  const handleClearToken = () => {
    Alert.alert('Remove token', 'Fish ID will stop working until you add a new token.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          await refreshInatStatus();
        },
      },
    ]);
  };

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

      {/* iNaturalist */}
      <Text style={styles.sectionTitle}>Fish ID (iNaturalist)</Text>
      {inatSaved && !inatExpired ? (
        <View style={styles.inatCard}>
          <Text style={styles.inatStatus}>Token active — fish ID enabled</Text>
          <TouchableOpacity onPress={handleClearToken} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Remove token</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inatCard}>
          {inatSaved && inatExpired && (
            <Text style={styles.inatExpired}>Token expired — paste a new one below.</Text>
          )}
          <Text style={styles.inatInstructions}>
            {'1. Log in at inaturalist.org\n2. Go to inaturalist.org/users/api_token\n3. Copy and paste the token here'}
          </Text>
          <TextInput
            style={styles.tokenInput}
            placeholder="Paste token here…"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={3}
            value={inatTokenInput}
            onChangeText={setInatTokenInput}
          />
          <TouchableOpacity
            style={[styles.saveBtn, !inatTokenInput.trim() && { opacity: 0.4 }]}
            onPress={handleSaveToken}
            disabled={!inatTokenInput.trim()}
          >
            <Text style={styles.saveBtnText}>Save token</Text>
          </TouchableOpacity>
          <Text style={styles.inatHint}>
            Tokens expire after 24 hours. Return here to refresh if fish ID stops working.
          </Text>
        </View>
      )}

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
    inatCard: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      gap: SPACING.sm,
    },
    inatStatus: {
      fontSize: FONT.md,
      color: COLORS.primary,
      fontWeight: String(FONT.semibold) as any,
    },
    inatExpired: {
      fontSize: FONT.sm,
      color: COLORS.danger ?? '#C0392B',
      fontWeight: String(FONT.medium) as any,
    },
    clearBtn: {
      alignSelf: 'flex-start',
    },
    clearBtnText: {
      fontSize: FONT.sm,
      color: COLORS.danger ?? '#C0392B',
    },
    inatInstructions: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    tokenInput: {
      backgroundColor: COLORS.surfaceAlt,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: 12,
      color: COLORS.text,
      fontFamily: 'monospace',
      minHeight: 72,
      textAlignVertical: 'top',
    },
    saveBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.sm,
      paddingVertical: SPACING.sm,
      alignItems: 'center',
    },
    saveBtnText: {
      color: COLORS.textOnPrimary,
      fontWeight: String(FONT.semibold) as any,
      fontSize: FONT.md,
    },
    inatHint: {
      fontSize: 12,
      color: COLORS.textSecondary,
      lineHeight: 17,
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
