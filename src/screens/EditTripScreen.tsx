import React, { useMemo, useState, useEffect } from 'react';
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
import { getTripById, updateTrip, deleteTrip } from '../db/database';
import type { ColorPalette } from '../theme/palettes';
import type { JournalScreenProps } from '../navigation/AppNavigator';
import { SPACING, RADIUS, FONT } from '../navigation/theme';

type Props = JournalScreenProps<'EditTrip'>;

export default function EditTripScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const [title, setTitle] = useState('');
  const [companions, setCompanions] = useState('');
  const [targetSpecies, setTargetSpecies] = useState('');
  const [notes, setNotes] = useState('');
  const [isGuided, setIsGuided] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTripById(tripId).then(t => {
      if (!t) return;
      setTitle(t.title);
      setCompanions(t.companions ?? '');
      setTargetSpecies(t.target_species ?? '');
      setNotes(t.notes ?? '');
      setIsGuided(t.is_guided === 1);
    });
  }, [tripId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a trip title.');
      return;
    }
    setSaving(true);
    await updateTrip(tripId, {
      title: title.trim(),
      companions: companions.trim() || null,
      target_species: targetSpecies.trim() || null,
      notes: notes.trim() || null,
      is_guided: isGuided ? 1 : 0,
    });
    setSaving(false);
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Delete trip', 'All catches will be unlinked. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTrip(tripId);
          navigation.popToTop();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="Title *">
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Trip title"
            placeholderTextColor={COLORS.textSecondary}
          />
        </Field>
        <Field label="Companions">
          <TextInput
            style={styles.input}
            value={companions}
            onChangeText={setCompanions}
            placeholder="e.g. Dad, Mike"
            placeholderTextColor={COLORS.textSecondary}
          />
        </Field>
        <Field label="Target species">
          <TextInput
            style={styles.input}
            value={targetSpecies}
            onChangeText={setTargetSpecies}
            placeholder="e.g. Brown trout"
            placeholderTextColor={COLORS.textSecondary}
          />
        </Field>
        <Field label="Notes">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes about this trip"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
          />
        </Field>
        <View style={styles.row}>
          <Text style={styles.label}>Guided trip</Text>
          <Switch
            value={isGuided}
            onValueChange={setIsGuided}
            trackColor={{ true: COLORS.primary }}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete trip</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.md, paddingBottom: 40 },
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
    multiline: { height: 100, textAlignVertical: 'top' },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      marginBottom: SPACING.md,
    },
    saveBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: {
      color: COLORS.textOnPrimary,
      fontSize: FONT.md,
      fontWeight: String(FONT.semibold) as any,
    },
    deleteBtn: {
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
