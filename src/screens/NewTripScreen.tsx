import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { createTrip } from '../db/database';
import type { ColorPalette } from '../theme/palettes';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

type Props = JournalScreenProps<'NewTrip'>;

export default function NewTripScreen({ navigation }: Props) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [title, setTitle] = useState('');
  const [companions, setCompanions] = useState('');
  const [targetSpecies, setTargetSpecies] = useState('');
  const [isGuided, setIsGuided] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a trip title.');
      return;
    }
    setSaving(true);
    await createTrip({
      title: title.trim(),
      companions: companions.trim() || null,
      notes: null,
      target_species: targetSpecies.trim() || null,
      is_guided: isGuided ? 1 : 0,
      catch_count_mode: 'auto',
      catch_count_manual: null,
    });
    setSaving(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Trip title"
            placeholderTextColor={COLORS.textSecondary}
            autoFocus
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Companions</Text>
          <TextInput
            style={styles.input}
            value={companions}
            onChangeText={setCompanions}
            placeholder="e.g. Dad, Mike"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Target species</Text>
          <TextInput
            style={styles.input}
            value={targetSpecies}
            onChangeText={setTargetSpecies}
            placeholder="e.g. Brown trout"
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Guided trip</Text>
          <Switch
            value={isGuided}
            onValueChange={setIsGuided}
            trackColor={{ true: COLORS.primary }}
          />
        </View>

        <TouchableOpacity
          style={[styles.createBtn, saving && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={saving}
        >
          <Text style={styles.createBtnText}>{saving ? 'Creating…' : 'Create Trip'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md },
    field: { marginBottom: SPACING.md },
    label: { fontSize: FONT.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
    input: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
      fontSize: FONT.md,
      color: COLORS.text,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      marginBottom: SPACING.md,
    },
    createBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      alignItems: 'center',
    },
    createBtnText: {
      color: COLORS.textOnPrimary,
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
    },
  });
}
