import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { entriesForPeriod } from '../logic';
import { useGoalsStore } from '../store';
import type { Cadence } from '../types';

import { AddGoalRow } from './add-goal-row';
import { GoalRow } from './goal-row';

/**
 * The goal lines for one page (period): materializes recurring goals on
 * mount, renders each line, and offers the next blank line.
 */
export function GoalList({ cadence, periodKey }: { cadence: Cadence; periodKey: string }) {
  const hydrated = useGoalsStore((s) => s.hydrated);
  const ensurePeriod = useGoalsStore((s) => s.ensurePeriod);
  const entries = useGoalsStore((s) => s.entries);

  useEffect(() => {
    if (hydrated) ensurePeriod(cadence, periodKey);
  }, [hydrated, cadence, periodKey, ensurePeriod]);

  if (!hydrated) return null;

  const list = entriesForPeriod(
    entries.filter((e) => e.cadence === cadence),
    periodKey,
  );

  return (
    <View style={styles.list}>
      {list.map((entry) => (
        <GoalRow key={entry.id} entry={entry} />
      ))}
      {list.length === 0 && (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          Nothing written on this page yet.
        </ThemedText>
      )}
      <AddGoalRow cadence={cadence} periodKey={periodKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.half,
  },
  empty: {
    paddingVertical: Spacing.two,
  },
});
