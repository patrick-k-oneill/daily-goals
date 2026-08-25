import { useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AddLine } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useGoalsStore } from '../store';
import type { Cadence } from '../types';

import { GoalForm } from './goal-form';

const EVERY: Record<Cadence, string> = { daily: 'day', weekly: 'week', annual: 'year' };

/** The blank next line on the pad — tap to write a new goal on this page. */
export function AddGoalRow({ cadence, periodKey }: { cadence: Cadence; periodKey: string }) {
  const theme = useTheme();
  const addGoal = useGoalsStore((s) => s.addGoal);
  const [open, setOpen] = useState(false);
  const [repeats, setRepeats] = useState(false);

  const close = () => {
    setOpen(false);
    setRepeats(false);
  };

  if (!open) {
    return (
      <AddLine label="+ Add goal" accessibilityLabel="Add a goal" onPress={() => setOpen(true)} />
    );
  }

  return (
    <GoalForm
      initial={{ title: '', targetCount: 1 }}
      placeholder="Write a goal…"
      submitLabel="Add"
      style={styles.form}
      onSubmit={(draft) => {
        addGoal({ cadence, periodKey, ...draft, repeats });
        close();
      }}
      onCancel={close}
      accessory={
        <View style={styles.repeatToggle}>
          <ThemedText type="small" themeColor="textSecondary">
            Repeats every {EVERY[cadence]}
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
      }
    />
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: Spacing.two,
  },
  repeatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
