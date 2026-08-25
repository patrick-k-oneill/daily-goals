import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { entriesForPeriod } from '../logic';
import { useGoalsStore } from '../store';
import type { Cadence } from '../types';

import { AddGoalRow } from './add-goal-row';
import { GoalRow } from './goal-row';
import { goalListLayouts } from './goal-row-layout';

/**
 * The goal lines for one page (period): materializes recurring goals on
 * mount, renders each line, and offers the next blank line. Measures itself
 * once so the whole section shares one layout rhythm (see goalListLayouts).
 */
export function GoalList({ cadence, periodKey }: { cadence: Cadence; periodKey: string }) {
  const ensurePeriod = useGoalsStore((s) => s.ensurePeriod);
  const entries = useGoalsStore((s) => s.entries);
  const [listWidth, setListWidth] = useState(0);

  useEffect(() => {
    ensurePeriod(cadence, periodKey);
  }, [cadence, periodKey, ensurePeriod]);

  const list = entriesForPeriod(
    entries.filter((e) => e.cadence === cadence),
    periodKey,
  );
  const layouts = goalListLayouts(
    listWidth,
    list.map((entry) => entry.checks.length),
  );

  const measure = (e: LayoutChangeEvent) => setListWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.list} onLayout={measure}>
      {list.map((entry, i) => (
        <GoalRow key={entry.id} entry={entry} layout={layouts[i]} />
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
