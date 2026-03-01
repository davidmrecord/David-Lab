import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getAllCatchesForGallery, getAllTripsWithCatches } from '../db/database';
import type { GalleryCatch, GalleryFilters, Trip } from '../types';
import type { ColorPalette } from '../theme/palettes';
import type { GalleryScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

type Props = GalleryScreenProps<'GalleryList'>;
type ViewMode = 'grid' | 'list';

export default function GalleryScreen({ navigation }: Props) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [catches, setCatches] = useState<GalleryCatch[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterTripId, setFilterTripId] = useState<number | undefined>(undefined);
  const [filterWaterBody, setFilterWaterBody] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const activeFilters: GalleryFilters = useMemo(() => {
    const f: GalleryFilters = {};
    if (filterSpecies.trim()) f.species = filterSpecies.trim();
    if (filterTripId !== undefined) f.tripId = filterTripId;
    if (filterWaterBody.trim()) f.waterBody = filterWaterBody.trim();
    if (filterDateFrom.trim()) f.dateFrom = filterDateFrom.trim();
    if (filterDateTo.trim()) f.dateTo = filterDateTo.trim();
    return f;
  }, [filterSpecies, filterTripId, filterWaterBody, filterDateFrom, filterDateTo]);

  const filterCount = Object.keys(activeFilters).length;

  const loadData = useCallback(async () => {
    const [catchData, tripData] = await Promise.all([
      getAllCatchesForGallery(activeFilters),
      getAllTripsWithCatches(),
    ]);
    setCatches(catchData);
    setTrips(tripData);
  }, [activeFilters]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setViewMode(m => (m === 'grid' ? 'list' : 'grid'))}
          style={{ marginRight: SPACING.sm }}
        >
          <Text style={{ fontSize: 18, color: COLORS.textOnPrimary }}>
            {viewMode === 'grid' ? '☰' : '⊞'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, viewMode, COLORS]);

  const clearFilters = () => {
    setFilterSpecies('');
    setFilterTripId(undefined);
    setFilterWaterBody('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          value={filterSpecies}
          onChangeText={setFilterSpecies}
          placeholder="Search species…"
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.filterToggle, filterCount > 0 && styles.filterToggleActive]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Text style={[styles.filterToggleText, filterCount > 0 && styles.filterToggleTextActive]}>
            {filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expanded filter panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Water body</Text>
          <TextInput
            style={styles.filterInput}
            value={filterWaterBody}
            onChangeText={setFilterWaterBody}
            placeholder="e.g. Green River"
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={styles.filterLabel}>Date from (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.filterInput}
            value={filterDateFrom}
            onChangeText={setFilterDateFrom}
            placeholder="e.g. 2024-05-01"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
          />

          <Text style={styles.filterLabel}>Date to (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.filterInput}
            value={filterDateTo}
            onChangeText={setFilterDateTo}
            placeholder="e.g. 2024-05-31"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
          />

          <Text style={styles.filterLabel}>Trip</Text>
          <FlatList
            horizontal
            data={trips}
            keyExtractor={t => String(t.id)}
            showsHorizontalScrollIndicator={false}
            style={styles.tripScroll}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.tripChip, filterTripId === item.id && styles.tripChipSelected]}
                onPress={() => setFilterTripId(filterTripId === item.id ? undefined : item.id)}
              >
                <Text style={[
                  styles.tripChipText,
                  filterTripId === item.id && styles.tripChipTextSelected,
                ]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
          />

          {filterCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results count */}
      <Text style={styles.resultCount}>
        {catches.length} photo{catches.length !== 1 ? 's' : ''}
      </Text>

      {/* Photo grid or list */}
      {viewMode === 'grid' ? (
        <FlatList
          data={catches}
          keyExtractor={c => String(c.id)}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <GridCell
              catch_={item}
              onPress={() => navigation.navigate('CatchDetail', { catchId: item.id })}
            />
          )}
        />
      ) : (
        <FlatList
          data={catches}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <ListRow
              catch_={item}
              onPress={() => navigation.navigate('CatchDetail', { catchId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

function GridCell({ catch_: c, onPress }: { catch_: GalleryCatch; onPress: () => void }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <Pressable style={styles.gridCell} onPress={onPress}>
      <Image source={{ uri: c.photo_uri! }} style={styles.gridImage} />
      {c.species && (
        <View style={styles.gridOverlay}>
          <Text style={styles.gridOverlayText} numberOfLines={1}>{c.species}</Text>
        </View>
      )}
    </Pressable>
  );
}

function ListRow({ catch_: c, onPress }: { catch_: GalleryCatch; onPress: () => void }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const date = new Date(c.caught_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return (
    <Pressable style={styles.listRow} onPress={onPress}>
      <Image source={{ uri: c.photo_uri! }} style={styles.listThumb} />
      <View style={styles.listInfo}>
        <Text style={styles.listSpecies} numberOfLines={1}>
          {c.species ?? 'Unknown species'}
        </Text>
        {c.water_body && (
          <Text style={styles.listMeta} numberOfLines={1}>{c.water_body}</Text>
        )}
        {c.trip_title && (
          <Text style={styles.listMeta} numberOfLines={1}>{c.trip_title}</Text>
        )}
        <Text style={styles.listDate}>{date}</Text>
        {c.weight_lbs != null && (
          <Text style={styles.listMeta}>{c.weight_lbs} lbs</Text>
        )}
      </View>
    </Pressable>
  );
}

function EmptyState() {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📷</Text>
      <Text style={styles.emptyTitle}>No photos yet</Text>
      <Text style={styles.emptySubtitle}>
        Catches with photos will appear here
      </Text>
    </View>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    searchInput: {
      flex: 1,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      fontSize: FONT.md,
      color: COLORS.text,
    },
    filterToggle: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    filterToggleActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    filterToggleText: { fontSize: FONT.sm, color: COLORS.textSecondary },
    filterToggleTextActive: { color: COLORS.textOnPrimary },
    filterPanel: {
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.md,
    },
    filterLabel: {
      fontSize: 11,
      color: COLORS.textSecondary,
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    filterInput: {
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      fontSize: FONT.md,
      color: COLORS.text,
    },
    tripScroll: { marginTop: SPACING.xs },
    tripChip: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
      marginRight: SPACING.xs,
    },
    tripChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tripChipText: { fontSize: FONT.sm, color: COLORS.text },
    tripChipTextSelected: { color: COLORS.textOnPrimary },
    clearBtn: {
      marginTop: SPACING.sm,
      alignSelf: 'flex-start',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.danger,
    },
    clearBtnText: { fontSize: FONT.sm, color: COLORS.danger },
    resultCount: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
    },
    // Grid
    gridContent: { paddingBottom: 24 },
    gridCell: {
      flex: 1 / 3,
      aspectRatio: 1,
      padding: 1,
    },
    gridImage: {
      flex: 1,
      backgroundColor: COLORS.surfaceAlt,
    },
    gridOverlay: {
      position: 'absolute',
      bottom: 1,
      left: 1,
      right: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    gridOverlayText: { fontSize: 10, color: '#fff' },
    // List
    listContent: { padding: SPACING.md, paddingBottom: 24 },
    listRow: {
      flexDirection: 'row',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.sm,
      overflow: 'hidden',
    },
    listThumb: {
      width: 88,
      height: 88,
      backgroundColor: COLORS.surfaceAlt,
    },
    listInfo: {
      flex: 1,
      padding: SPACING.sm,
      justifyContent: 'center',
    },
    listSpecies: {
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.text,
      marginBottom: 2,
    },
    listMeta: { fontSize: FONT.sm, color: COLORS.textSecondary },
    listDate: { fontSize: FONT.sm, color: COLORS.primary, marginTop: 2 },
    // Empty
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
    emptyTitle: {
      fontSize: FONT.xl,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    emptySubtitle: { fontSize: FONT.md, color: COLORS.textSecondary },
  });
}
