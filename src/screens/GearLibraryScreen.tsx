import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getAllGear } from '../db/database';
import type { ColorPalette } from '../theme/palettes';
import type { Gear, GearType } from '../types';
import { GEAR_TYPES } from '../types';
import type { GearScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

type Props = GearScreenProps<'GearLibrary'>;

export default function GearLibraryScreen({ navigation }: Props) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [gear, setGear] = useState<Gear[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllGear().then(setGear);
    }, [])
  );

  // Group by type
  const sections = useMemo(() => {
    const byType: Record<string, Gear[]> = {};
    for (const g of gear) {
      if (!byType[g.type]) byType[g.type] = [];
      byType[g.type].push(g);
    }
    return GEAR_TYPES
      .filter(t => byType[t]?.length)
      .map(t => ({ title: capitalize(t), data: byType[t] }));
  }, [gear]);

  return (
    <View style={styles.container}>
      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🪝</Text>
          <Text style={styles.emptyTitle}>No gear yet</Text>
          <Text style={styles.emptySubtitle}>Tap + to add your first item</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={g => String(g.id)}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('AddGear', { gearId: item.id })}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                {item.brand && (
                  <Text style={styles.rowMeta}>{item.brand}{item.model ? ` · ${item.model}` : ''}</Text>
                )}
              </View>
              {(item.catch_count ?? 0) > 0 && (
                <Text style={styles.usageCount}>{item.catch_count} catch{item.catch_count !== 1 ? 'es' : ''}</Text>
              )}
            </Pressable>
          )}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddGear')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    list: { padding: SPACING.md, paddingBottom: 100 },
    sectionHeader: {
      fontSize: FONT.sm,
      fontWeight: String(FONT.semibold) as any,
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: SPACING.md,
      marginBottom: SPACING.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.xs,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    rowInfo: { flex: 1 },
    rowName: {
      fontSize: FONT.md,
      fontWeight: String(FONT.medium) as any,
      color: COLORS.text,
    },
    rowMeta: { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 2 },
    usageCount: { fontSize: FONT.sm, color: COLORS.textSecondary },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    },
    fabText: { fontSize: 30, color: COLORS.textOnPrimary, lineHeight: 34 },
  });
}
