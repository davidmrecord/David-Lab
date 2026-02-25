import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getCatchById, deleteCatch } from '../db/database';
import type { ColorPalette } from '../theme/palettes';
import type { Catch } from '../types';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

type Props = JournalScreenProps<'CatchDetail'>;

export default function CatchDetailScreen({ route, navigation }: Props) {
  const { catchId } = route.params;
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [catch_, setCatch] = useState<Catch | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCatchById(catchId).then(c => {
        setCatch(c);
        if (c?.species) navigation.setOptions({ title: c.species });
      });
    }, [catchId])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('EditCatch', { catchId })}
          style={{ marginRight: SPACING.sm }}
        >
          <Text style={{ color: COLORS.textOnPrimary }}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, catchId, COLORS]);

  const handleDelete = () => {
    Alert.alert('Delete catch', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCatch(catchId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!catch_) return null;

  const date = new Date(catch_.caught_at).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Sync pill */}
      {catch_.needs_sync === 1 && (
        <View style={styles.syncPill}>
          <Text style={styles.syncPillText}>🔄 Pending sync</Text>
        </View>
      )}

      {/* Photo */}
      {catch_.photo_uri && (
        <Image source={{ uri: catch_.photo_uri }} style={styles.photo} />
      )}

      {/* Species */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Species</Text>
        <Text style={styles.mainValue}>{catch_.species ?? '—'}</Text>
        {catch_.species_scientific && (
          <Text style={styles.secondary}>{catch_.species_scientific}</Text>
        )}
        {catch_.species_confidence != null && (
          <Text style={styles.secondary}>
            {Math.round(catch_.species_confidence * 100)}% confidence
          </Text>
        )}
      </View>

      {/* Details grid */}
      <View style={styles.grid}>
        <Detail label="Date" value={date} />
        <Detail label="Location" value={catch_.water_body ?? '—'} />
        <Detail label="Water type" value={catch_.water_body_type ?? '—'} />
        <Detail label="Weight" value={catch_.weight_lbs ? `${catch_.weight_lbs} lbs` : '—'} />
        <Detail label="Water temp" value={catch_.water_temp_f ? `${catch_.water_temp_f}°F` : '—'} />
      </View>

      {/* Weather */}
      {(catch_.weather_temp_f != null || catch_.weather_condition) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather</Text>
          <View style={styles.grid}>
            {catch_.weather_condition && (
              <Detail label="Condition" value={catch_.weather_condition} />
            )}
            {catch_.weather_temp_f != null && (
              <Detail label="Air temp" value={`${Math.round(catch_.weather_temp_f)}°F`} />
            )}
            {catch_.weather_wind_mph != null && (
              <Detail label="Wind" value={`${Math.round(catch_.weather_wind_mph)} mph`} />
            )}
            {catch_.weather_precipitation_in != null && (
              <Detail label="Precip" value={`${catch_.weather_precipitation_in.toFixed(2)} in`} />
            )}
          </View>
        </View>
      )}

      {/* Notes */}
      {catch_.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{catch_.notes}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>Delete catch</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md, paddingBottom: 40 },
    syncPill: {
      alignSelf: 'flex-start',
      backgroundColor: COLORS.badge,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      marginBottom: SPACING.md,
    },
    syncPillText: { fontSize: FONT.sm, color: COLORS.badgeText, fontWeight: String(FONT.medium) as any },
    photo: {
      width: '100%',
      height: 240,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surfaceAlt,
      marginBottom: SPACING.md,
    },
    section: { marginBottom: SPACING.md },
    sectionTitle: {
      fontSize: FONT.sm,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: SPACING.xs,
    },
    mainValue: {
      fontSize: FONT.xxl,
      fontWeight: String(FONT.bold) as any,
      color: COLORS.text,
    },
    secondary: { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 2 },
    grid: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.md,
    },
    detail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    detailLabel: { fontSize: FONT.md, color: COLORS.textSecondary },
    detailValue: {
      fontSize: FONT.md,
      color: COLORS.text,
      fontWeight: String(FONT.medium) as any,
      maxWidth: '60%',
      textAlign: 'right',
    },
    notesText: { fontSize: FONT.md, color: COLORS.text, lineHeight: 22 },
    deleteBtn: {
      marginTop: SPACING.xl,
      padding: SPACING.md,
      alignItems: 'center',
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.danger,
    },
    deleteBtnText: {
      color: COLORS.danger,
      fontWeight: String(FONT.semibold) as any,
      fontSize: FONT.md,
    },
  });
}
