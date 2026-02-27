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
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../theme/ThemeContext';
import { getSetting, setSetting, persistPhoto } from '../db/database';
import { pickPhotoFromLibrary } from '../services/photo';
import {
  exchangeAndStoreToken,
  signOut,
  isSignedIn,
  saveToken,
  getTokenStatus,
  clearToken,
  redirectUri,
  CLIENT_ID,
  INAT_AUTHORIZATION_ENDPOINT,
} from '../services/iNaturalistAuth';
import { PALETTES } from '../theme/palettes';
import type { ColorPalette } from '../theme/palettes';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

// Required for the OAuth redirect to close the browser and return to the app.
WebBrowser.maybeCompleteAuthSession();

const BUILD_ID = 'v0.2.14 · 2026-02-27 build 6';

type Props = JournalScreenProps<'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { colors: COLORS, themeName, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [inatSignedIn, setInatSignedIn] = useState(false);
  const [inatLoading, setInatLoading] = useState(false);
  const [inatTokenSaved, setInatTokenSaved] = useState(false);
  const [inatTokenExpired, setInatTokenExpired] = useState(false);
  const [inatTokenInput, setInatTokenInput] = useState('');

  // OAuth Authorization Code request — iNaturalist doesn't support PKCE.
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: CLIENT_ID, redirectUri, responseType: 'code', usePKCE: false },
    { authorizationEndpoint: INAT_AUTHORIZATION_ENDPOINT },
  );

  const refreshSignInStatus = useCallback(async () => {
    setInatSignedIn(await isSignedIn());
    const status = await getTokenStatus();
    setInatTokenSaved(status.saved);
    setInatTokenExpired(status.expired);
  }, []);

  useEffect(() => {
    getSetting('avatar_uri').then(v => setAvatarUri(v));
    refreshSignInStatus();
  }, [refreshSignInStatus]);

  // Handle the OAuth browser redirect response.
  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const { code } = response.params;
      setInatLoading(true);
      exchangeAndStoreToken(code)
        .then(refreshSignInStatus)
        .catch(e => Alert.alert('Sign in failed', e.message ?? 'Could not complete sign-in.'))
        .finally(() => setInatLoading(false));
    } else if (response.type === 'error') {
      Alert.alert('Sign in failed', response.error?.message ?? 'Sign-in was cancelled.');
    }
  }, [response, refreshSignInStatus]);

  const handleSignIn = () => {
    promptAsync();
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Fish ID will stop working until you sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          await refreshSignInStatus();
        },
      },
    ]);
  };

  const handleSaveToken = async () => {
    const trimmed = inatTokenInput.trim();
    if (!trimmed) return;
    try {
      await saveToken(trimmed);
      setInatTokenInput('');
      await refreshSignInStatus();
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
          await refreshSignInStatus();
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
      <View style={styles.inatCard}>
        {inatSignedIn ? (
          <>
            <Text style={styles.inatStatus}>Connected — fish ID enabled</Text>
            <Text style={styles.inatHint}>
              Your session is active. The app refreshes credentials automatically.
            </Text>
            <TouchableOpacity onPress={handleSignOut} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Sign out</Text>
            </TouchableOpacity>
          </>
        ) : inatTokenSaved && !inatTokenExpired ? (
          <>
            <Text style={styles.inatStatus}>Token active — fish ID enabled</Text>
            <TouchableOpacity onPress={handleClearToken} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Remove token</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {inatTokenSaved && inatTokenExpired && (
              <Text style={styles.inatExpired}>Token expired — paste a new one below.</Text>
            )}
            {/* OAuth sign-in (requires a registered iNaturalist OAuth app) */}
            <TouchableOpacity
              style={[styles.saveBtn, (!request || inatLoading) && { opacity: 0.5 }]}
              onPress={handleSignIn}
              disabled={!request || inatLoading}
            >
              <Text style={styles.saveBtnText}>
                {inatLoading ? 'Signing in…' : 'Sign in with iNaturalist'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.inatDivider}>or paste a token manually</Text>
            {/* Manual token fallback */}
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
              style={[styles.saveBtnSecondary, !inatTokenInput.trim() && { opacity: 0.4 }]}
              onPress={handleSaveToken}
              disabled={!inatTokenInput.trim()}
            >
              <Text style={styles.saveBtnSecondaryText}>Save token</Text>
            </TouchableOpacity>
            <Text style={styles.inatHint}>
              Tokens expire after 24 hours. Sign in above for automatic refresh.
            </Text>
          </>
        )}
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
    inatDivider: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginVertical: SPACING.xs,
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
    clearBtn: {
      alignSelf: 'flex-start',
    },
    clearBtnText: {
      fontSize: FONT.sm,
      color: COLORS.danger ?? '#C0392B',
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
    saveBtnSecondary: {
      borderWidth: 1,
      borderColor: COLORS.primary,
      borderRadius: RADIUS.sm,
      paddingVertical: SPACING.sm,
      alignItems: 'center',
    },
    saveBtnSecondaryText: {
      color: COLORS.primary,
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
