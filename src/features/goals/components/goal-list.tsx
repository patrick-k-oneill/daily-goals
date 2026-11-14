import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ReorderableRow, useReorderable } from '@/components/ui/reorderable';
import { Spacing } from '@/constants/theme';
import { useTextScale } from '@/features/text-size/store';
import type { DayKey } from '@/lib/dates';

import { entriesForPeriod, periodKeyFor } from '../logic';
import { useGoalsStore } from '../store';
import type { Cadence } from '../types';

import { AddGoalRow } from './add-goal-row';
import { GoalRow } from './goal-row';
import { goalListLayouts } from './goal-row-layout';
import { SuggestionRows } from './suggestion-row';

/**
 * One cadence's section of the page for the period containing `day`: each
 * line, any suggestions, then the next blank one. Today's page is written by
 * the goals store; the section only reads it and moves its lines. Measures
 * itself once so the whole section shares one layout rhythm (see
 * goalListLayouts).
 */
export function GoalList({ cadence, day }: { cadence: Cadence; day: DayKey }) {
  const periodKey = periodKeyFor(cadence, day);
  const entries = useGoalsStore((s) => s.entries);
  const moveEntry = useGoalsStore((s) => s.moveEntry);
  const [listWidth, setListWidth] = useState(0);
  const textScale = useTextScale();

  const list = entriesForPeriod(entries, periodKey);
  // Boxes, labels and the title all grow with the text size, so the fit is judged in 100% units.
  const layouts = goalListLayouts(listWidth / textScale, list);
  const reorder = useReorderable({
    ids: list.map((entry) => entry.id),
    gap: styles.list.gap,
    onMove: moveEntry,
  });

  const measure = (e: LayoutChangeEvent) => setListWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.list} onLayout={measure}>
      {list.map((entry, i) => (
        <ReorderableRow key={reorder.keyOf(entry.id)} id={entry.id} reorder={reorder}>
          <GoalRow entry={entry} layout={layouts[i]} />
        </ReorderableRow>
      ))}
      {list.length === 0 && (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          Nothing written on this page yet.
        </ThemedText>
      )}
      <SuggestionRows cadence={cadence} periodKey={periodKey} />
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
