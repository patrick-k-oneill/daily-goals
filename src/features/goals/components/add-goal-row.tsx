import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { MAX_CHECKS } from '../logic';
import { useGoalsStore } from '../store';
import type { Cadence } from '../types';

/** The blank next line on the pad — tap to write a new goal on this page. */
export function AddGoalRow({ cadence, periodKey }: { cadence: Cadence; periodKey: string }) {
  const theme = useTheme();
  const addGoal = useGoalsStore((s) => s.addGoal);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetCount, setTargetCount] = useState(1);
  const [repeats, setRepeats] = useState(false);

  const canSubmit = Boolean(title.trim());

  const reset = () => {
    setOpen(false);
    setTitle('');
    setTargetCount(1);
    setRepeats(false);
  };

  const submit = () => {
    if (!canSubmit) return;
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
            style={styles.stepperButton}
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
            style={styles.stepperButton}
            onPress={() => setTargetCount((n) => Math.min(MAX_CHECKS, n + 1))}>
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
            trackColor={{ false: theme.border, true: theme.accent }}
            // Web renders no platform track, so the knob needs its own contrast.
            thumbColor={Platform.OS === 'web' ? theme.text : undefined}
            accessibilityLabel="Repeats every period"
          />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={submit}
          style={[
            styles.addButton,
            { backgroundColor: theme.accent },
            !canSubmit && styles.buttonDisabled,
          ]}>
          <ThemedText type="smallBold" style={styles.addLabel}>
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
  // A real 44×44pt box (hitSlop doesn't extend DOM hit areas on web); negative
  // margins keep the visual footprint of the old 28×30pt glyph box.
  stepperButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -7,
    marginHorizontal: -8,
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
  buttonDisabled: {
    opacity: 0.4,
  },
  addLabel: {
    color: '#FFFFFF',
  },
});
