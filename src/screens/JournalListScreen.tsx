import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getAllTripsWithCatches } from '../db/database';
import type { ColorPalette } from '../theme/palettes';
import type { Trip, Catch } from '../types';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

type Props = JournalScreenProps<'JournalList'>;

export default function JournalListScreen({ navigation }: Props) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrips = useCallback(async () => {
    const data = await getAllTripsWithCatches();
    setTrips(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  }, [loadTrips]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={{ marginRight: SPACING.sm }}
        >
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎣</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap + to log your first catch
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
          />
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewEntry')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const catches = trip.catches ?? [];
  const thumbnails = catches.filter(c => c.photo_uri).slice(0, 4);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{trip.title}</Text>
        {(trip.unsynced_count ?? 0) > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔄 {trip.unsynced_count} pending</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardMeta}>
        {catches.length} catch{catches.length !== 1 ? 'es' : ''}
        {trip.companions ? ` · ${trip.companions}` : ''}
      </Text>
      {thumbnails.length > 0 && (
        <View style={styles.thumbnailRow}>
          {thumbnails.map(c => (
            <Image
              key={c.id}
              source={{ uri: c.photo_uri! }}
              style={styles.thumbnail}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    list: { padding: SPACING.md, paddingBottom: 100 },
    card: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.xs,
    },
    cardTitle: {
      flex: 1,
      fontSize: FONT.lg,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.text,
    },
    cardMeta: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
    badge: {
      backgroundColor: COLORS.badge,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 2,
      marginLeft: SPACING.sm,
    },
    badgeText: { fontSize: 11, color: COLORS.badgeText, fontWeight: String(FONT.medium) as any },
    thumbnailRow: { flexDirection: 'row', gap: SPACING.xs },
    thumbnail: {
      width: 60,
      height: 60,
      borderRadius: RADIUS.sm,
      backgroundColor: COLORS.surfaceAlt,
    },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
    emptyTitle: {
      fontSize: FONT.xl,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    emptySubtitle: { fontSize: FONT.md, color: COLORS.textSecondary },
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    fabText: { fontSize: 30, color: COLORS.textOnPrimary, lineHeight: 34 },
  });
}
