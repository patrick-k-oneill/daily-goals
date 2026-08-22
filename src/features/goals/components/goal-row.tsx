import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CheckBox } from '@/components/ui/check-box';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { selectionTap } from '@/lib/haptics';

import { useGoalsStore } from '../store';
import type { GoalEntry } from '../types';

/**
 * One ruled line of the pad: margin star, the goal's checkboxes, then its
 * title. Long-press the title to remove the goal.
 */
export function GoalRow({ entry }: { entry: GoalEntry }) {
  const theme = useTheme();
  const cycleCheck = useGoalsStore((s) => s.cycleCheck);
  const toggleStar = useGoalsStore((s) => s.toggleStar);
  const removeGoal = useGoalsStore((s) => s.removeGoal);

  const onRemove = () => {
    const recurring = Boolean(entry.templateId);
    confirmAction(
      'Remove goal',
      recurring
        ? `Remove “${entry.title}” from this page and stop it repeating in future periods?`
        : `Remove “${entry.title}” from this page?`,
      () => removeGoal(entry.id, { stopRepeating: recurring }),
    );
  };

  return (
    <View style={[styles.row, { borderBottomColor: theme.rule }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          entry.starred ? `Unstar ${entry.title}` : `Star ${entry.title} as a key goal`
        }
        hitSlop={8}
        onPress={() => {
          selectionTap();
          toggleStar(entry.id);
        }}>
        <ThemedText
          type="subtitle"
          themeColor={entry.starred ? 'accent' : 'border'}
          style={styles.star}>
          {entry.starred ? '★' : '☆'}
        </ThemedText>
      </Pressable>

      <View style={styles.checks}>
        {/* A check's position is its identity — checks never reorder, so index keys are stable. */}
        {entry.checks.map((state, i) => (
          <CheckBox
            // react-doctor-disable-next-line react-doctor/no-array-index-as-key
            key={i}
            state={state}
            label={entry.checkLabels?.[i]}
            accessibilityLabel={`${entry.title}, check ${i + 1} of ${entry.checks.length}`}
            onCycle={() => cycleCheck(entry.id, i)}
          />
        ))}
      </View>

      <Pressable
        style={styles.titlePress}
        accessibilityRole="text"
        onLongPress={onRemove}
        delayLongPress={400}>
        <ThemedText>{entry.title}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  star: {
    lineHeight: 28,
  },
  checks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    maxWidth: '60%',
  },
  titlePress: {
    flex: 1,
    minWidth: 120,
  },
});
