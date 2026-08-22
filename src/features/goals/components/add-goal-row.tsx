import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useGoalsStore } from '../store';
import type { Cadence } from '../types';

const MAX_TARGET = 10;

/** The blank next line on the pad — tap to write a new goal on this page. */
export function AddGoalRow({ cadence, periodKey }: { cadence: Cadence; periodKey: string }) {
  const theme = useTheme();
  const addGoal = useGoalsStore((s) => s.addGoal);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetCount, setTargetCount] = useState(1);
  const [repeats, setRepeats] = useState(false);

  const reset = () => {
    setOpen(false);
    setTitle('');
    setTargetCount(1);
    setRepeats(false);
  };

  const submit = () => {
    if (!title.trim()) return;
    addGoal({ cadence, periodKey, title, targetCount, repeats });
    reset();
  };

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a goal"
        onPress={() => setOpen(true)}
        style={styles.collapsed}>
        <ThemedText themeColor="textSecondary">+ Add goal</ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.form, { borderColor: theme.border }]}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Write a goal…"
        placeholderTextColor={theme.textSecondary}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        style={[styles.input, { color: theme.text, borderBottomColor: theme.rule }]}
      />

      <View style={styles.optionsRow}>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fewer checks"
            hitSlop={8}
            onPress={() => setTargetCount((n) => Math.max(1, n - 1))}>
            <ThemedText type="subtitle" themeColor="textSecondary">
              −
            </ThemedText>
          </Pressable>
          <ThemedText type="smallBold">
            {targetCount} {targetCount === 1 ? 'check' : 'checks'}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More checks"
            hitSlop={8}
            onPress={() => setTargetCount((n) => Math.min(MAX_TARGET, n + 1))}>
            <ThemedText type="subtitle" themeColor="textSecondary">
              +
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.repeatToggle}>
          <ThemedText type="small" themeColor="textSecondary">
            Repeats every {cadence === 'daily' ? 'day' : cadence === 'weekly' ? 'week' : 'year'}
          </ThemedText>
          <Switch
            value={repeats}
            onValueChange={setRepeats}
            trackColor={{ true: theme.accent }}
            accessibilityLabel="Repeats every period"
          />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
            Add
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={reset} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    paddingVertical: Spacing.two,
  },
  form: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  repeatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  addButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
