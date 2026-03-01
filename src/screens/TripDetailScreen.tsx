import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getTripById, updateTrip, deleteTrip, deleteTripWithCatches } from '../db/database';
import { syncTrip } from '../services/sync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import type { ColorPalette } from '../theme/palettes';
import type { Trip, Catch } from '../types';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

type Props = JournalScreenProps<'TripDetail'>;

export default function TripDetailScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const { isOffline } = useNetworkStatus();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const t = await getTripById(tripId);
    setTrip(t);
    if (t) navigation.setOptions({ title: t.title });
  }, [tripId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
          <TouchableOpacity onPress={handleDeleteTrip}>
            <Text style={{ color: '#FF9494' }}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('EditTrip', { tripId })}>
            <Text style={{ color: COLORS.textOnPrimary, marginRight: SPACING.sm }}>Edit</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, tripId, COLORS, handleDeleteTrip]);

  const handleDeleteTrip = useCallback(() => {
    if (!trip) return;
    const catchCount = trip.catches?.length ?? 0;
    const hasCatches = catchCount > 0;
    Alert.alert(
      'Delete trip',
      hasCatches
        ? `"${trip.title}" has ${catchCount} catch${catchCount !== 1 ? 'es' : ''}. Delete catches too?`
        : `Delete "${trip.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...(hasCatches ? [{
          text: 'Delete trip only',
          onPress: async () => {
            await deleteTrip(tripId);
            navigation.goBack();
          },
        }] : []),
        {
          text: hasCatches ? 'Delete trip + catches' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await (hasCatches ? deleteTripWithCatches(tripId) : deleteTrip(tripId));
            navigation.goBack();
          },
        },
      ]
    );
  }, [trip, tripId, navigation]);

  const handleSync = async () => {
    setSyncing(true);
    const results = await syncTrip(tripId);
    setSyncing(false);
    const failed = results.filter(r => !r.success).length;
    await load();
    Alert.alert(
      'Sync complete',
      failed > 0
        ? `${results.length - failed} synced, ${failed} failed`
        : `${results.length} catch${results.length !== 1 ? 'es' : ''} synced`
    );
  };

  const toggleCatchCountMode = async () => {
    if (!trip) return;
    const next = trip.catch_count_mode === 'auto' ? 'manual' : 'auto';
    await updateTrip(tripId, { catch_count_mode: next });
    await load();
  };

  if (!trip) return null;

  const catches = trip.catches ?? [];
  const displayCount =
    trip.catch_count_mode === 'manual' && trip.catch_count_manual != null
      ? trip.catch_count_manual
      : catches.length;

  return (
    <View style={styles.container}>
      {/* Sync banner */}
      {(trip.unsynced_count ?? 0) > 0 && !isOffline && (
        <TouchableOpacity
          style={styles.syncBanner}
          onPress={handleSync}
          disabled={syncing}
        >
          <Text style={styles.syncBannerText}>
            {syncing ? 'Syncing…' : `🔄 ${trip.unsynced_count} pending — Sync now`}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={catches}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>Catch count</Text>
              <View style={styles.countToggle}>
                <Text style={styles.countValue}>{displayCount}</Text>
                <Switch
                  value={trip.catch_count_mode === 'manual'}
                  onValueChange={toggleCatchCountMode}
                  trackColor={{ true: COLORS.primary }}
                />
                <Text style={styles.countMode}>
                  {trip.catch_count_mode === 'manual' ? 'Manual' : 'Auto'}
                </Text>
              </View>
            </View>
            {trip.companions && (
              <Text style={styles.meta}>With: {trip.companions}</Text>
            )}
            {trip.target_species && (
              <Text style={styles.meta}>Targeting: {trip.target_species}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No catches yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CatchRow
            catch_={item}
            onPress={() => navigation.navigate('CatchDetail', { catchId: item.id })}
          />
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewEntry', { tripId })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function CatchRow({ catch_: c, onPress }: { catch_: Catch; onPress: () => void }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <Pressable style={styles.catchRow} onPress={onPress}>
      {c.photo_uri ? (
        <Image source={{ uri: c.photo_uri }} style={styles.catchThumb} />
      ) : (
        <View style={[styles.catchThumb, styles.catchThumbEmpty]}>
          <Text style={{ fontSize: 22 }}>🐟</Text>
        </View>
      )}
      <View style={styles.catchInfo}>
        <Text style={styles.catchSpecies}>{c.species ?? 'Unknown species'}</Text>
        <Text style={styles.catchMeta}>
          {c.water_body ?? ''}
          {c.weight_lbs ? ` · ${c.weight_lbs} lbs` : ''}
        </Text>
      </View>
      {c.needs_sync === 1 && <Text style={styles.syncIcon}>🔄</Text>}
    </Pressable>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    syncBanner: {
      backgroundColor: COLORS.warning,
      padding: SPACING.md,
      alignItems: 'center',
    },
    syncBannerText: { color: '#fff', fontWeight: String(FONT.semibold) as any },
    list: { padding: SPACING.md, paddingBottom: 100 },
    header: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    countRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    countLabel: { fontSize: FONT.md, color: COLORS.textSecondary },
    countToggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    countValue: {
      fontSize: FONT.xxl,
      fontWeight: String(FONT.bold) as any,
      color: COLORS.primary,
      minWidth: 36,
      textAlign: 'right',
    },
    countMode: { fontSize: FONT.sm, color: COLORS.textSecondary },
    meta: { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 2 },
    catchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    catchThumb: {
      width: 56,
      height: 56,
      borderRadius: RADIUS.sm,
      backgroundColor: COLORS.surfaceAlt,
    },
    catchThumbEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    catchInfo: { flex: 1, marginLeft: SPACING.md },
    catchSpecies: {
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.text,
    },
    catchMeta: { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 2 },
    syncIcon: { fontSize: 16, marginLeft: SPACING.xs },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: FONT.md, color: COLORS.textSecondary },
    fab: {
      position: 'absolute',
      bottom: SPACING.xl,
      right: SPACING.xl,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
    fabText: { fontSize: 30, color: COLORS.textOnPrimary, lineHeight: 34 },
  });
}
