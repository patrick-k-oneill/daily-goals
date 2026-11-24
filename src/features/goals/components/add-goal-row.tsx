import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AddLine } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';

import { EVERY_WEEKDAY } from '../logic';
import { useGoalsStore } from '../store';
import type { Cadence } from '../types';

import { GoalForm } from './goal-form';
import { RepeatsToggle } from './repeats-toggle';

/** The blank next line on the pad — tap to write a new goal on this page. */
export function AddGoalRow({ cadence, periodKey }: { cadence: Cadence; periodKey: string }) {
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
      initial={{ title: '', targetCount: 1, checkLabels: [], weekdays: [...EVERY_WEEKDAY] }}
      placeholder="Write a goal…"
      submitLabel="Add"
      style={styles.form}
      showWeekdays={cadence === 'daily' && repeats}
      onSubmit={(draft) => {
        addGoal({ cadence, periodKey, ...draft, repeats });
        close();
      }}
      onCancel={close}
      accessory={<RepeatsToggle value={repeats} onValueChange={setRepeats} />}
    />
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: Spacing.two,
  },
});
