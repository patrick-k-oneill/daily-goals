import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { useReorderHandle } from '@/components/ui/reorderable';
import { Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';

import { EVERY_WEEKDAY, hasCheckLabels } from '../logic';
import { useGoalsStore } from '../store';
import type { GoalEntry } from '../types';

import { CheckBox } from './check-box';
import { GoalForm } from './goal-form';
import { CHECK_BOX_GAP, MIN_INLINE_TITLE_WIDTH, type GoalRowLayout } from './goal-row-layout';

/**
 * One ruled line of the pad: the goal's checkboxes at the margin edge, then
 * its title. Tap the title to edit it in place; long-press it and drag to move
 * the line within its section. The list decides each row's
 * layout (goalListLayouts) so a section keeps one rhythm: inline rows read
 * checks-first on one line, stacked rows take two ruled lines — the title,
 * then the checks beneath it.
 */
export function GoalRow({ entry, layout }: { entry: GoalEntry; layout: GoalRowLayout }) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <GoalRowEditor entry={entry} onDone={() => setEditing(false)} />;
  }

  if (layout === 'stacked') {
    return (
      <View style={[styles.row, styles.rowStacked, { borderBottomColor: theme.rule }]}>
        <View style={styles.stackedBody}>
          <TitleButton entry={entry} onEdit={() => setEditing(true)} />
          <ChecksGroup entry={entry} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: theme.rule }]}>
      <ChecksGroup entry={entry} />
      <TitleButton entry={entry} onEdit={() => setEditing(true)} style={styles.titlePress} />
    </View>
  );
}

function ChecksGroup({ entry }: { entry: GoalEntry }) {
  const cycleCheck = useGoalsStore((s) => s.cycleCheck);
  const labeled = hasCheckLabels(entry.checkLabels);

  return (
    <View style={styles.checks}>
      {/* A check's position is its identity — checks never reorder, so index keys are stable. */}
      {entry.checks.map((state, i) => {
        const label = entry.checkLabels?.[i] || undefined;
        const position = `check ${i + 1} of ${entry.checks.length}`;
        return (
          <CheckBox
            // react-doctor-disable-next-line react-doctor/no-array-index-as-key
            key={i}
            state={state}
            label={label}
            reserveLabelLine={labeled}
            accessibilityLabel={[entry.title, label, position].filter(Boolean).join(', ')}
            onCycle={() => cycleCheck(entry.id, i)}
          />
        );
      })}
    </View>
  );
}

function TitleButton({
  entry,
  onEdit,
  style,
}: {
  entry: GoalEntry;
  onEdit: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();
  const handle = useReorderHandle();

  return (
    // pan-y leaves a touch on the title free to scroll the page on web.
    <GestureDetector gesture={handle.gesture} touchAction="pan-y">
      <Pressable
        {...hoverProps}
        {...handle.pressableProps}
        style={[styles.title, hovered && { backgroundColor: theme.backgroundElement }, style]}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${entry.title}`}
        onPress={handle.unlessLifted(onEdit)}>
        <ThemedText>{entry.title}</ThemedText>
      </Pressable>
    </GestureDetector>
  );
}

function GoalRowEditor({ entry, onDone }: { entry: GoalEntry; onDone: () => void }) {
  const updateGoal = useGoalsStore((s) => s.updateGoal);
  const removeGoal = useGoalsStore((s) => s.removeGoal);
  const template = useGoalsStore((s) => s.templates.find((t) => t.id === entry.templateId));
  const recurring = Boolean(entry.templateId);

  const remove = () => {
    confirmAction(
      'Remove goal',
      recurring
        ? `Remove “${entry.title}” from this page and stop it repeating in future periods?`
        : `Remove “${entry.title}” from this page?`,
      () => removeGoal(entry.id),
    );
  };

  return (
    <GoalForm
      initial={{
        title: entry.title,
        targetCount: entry.checks.length,
        checkLabels: entry.checkLabels ?? [],
        weekdays: template?.weekdays ?? [...EVERY_WEEKDAY],
      }}
      placeholder="Goal title…"
      submitLabel="Save"
      style={styles.editor}
      showWeekdays={recurring && entry.cadence === 'daily'}
      onSubmit={(draft) => {
        updateGoal(entry.id, draft);
        onDone();
      }}
      onCancel={onDone}
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={remove}
          hitSlop={4}
          style={styles.removePress}>
          <ThemedText type="small" themeColor="missed">
            Remove{recurring ? ' & stop repeating' : ''}
          </ThemedText>
        </Pressable>
      }
    />
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
  rowStacked: {
    alignItems: 'flex-start',
  },
  stackedBody: {
    flex: 1,
    gap: Spacing.one,
  },
  checks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CHECK_BOX_GAP,
  },
  // The hover tint overhangs the text by 4pt either side without moving it.
  title: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one,
    marginHorizontal: -Spacing.one,
  },
  titlePress: {
    flex: 1,
    minWidth: MIN_INLINE_TITLE_WIDTH,
  },
  editor: {
    marginVertical: Spacing.one,
  },
  removePress: {
    alignSelf: 'flex-start',
  },
});
