import { useState } from 'react';
// LayoutAnimation is deliberate: it drives Core Animation natively (not the JS
// thread) for one occasional 300ms settle on a user tap. Reanimated layout
// transitions would wrap every row in Animated.View and also animate the
// width-driven stack/inline re-harmonization, which must stay instant.
import {
  // react-doctor-disable-next-line react-doctor/rn-prefer-reanimated
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BODY_LINE_HEIGHT, ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { selectionTap } from '@/lib/haptics';

import { useGoalsStore } from '../store';
import type { GoalEntry } from '../types';

import { CheckBox } from './check-box';
import { GoalForm } from './goal-form';
import { CHECK_BOX_GAP, MIN_INLINE_TITLE_WIDTH, type GoalRowLayout } from './goal-row-layout';

/**
 * One ruled line of the pad: margin star, the goal's checkboxes, then its
 * title. Tap the title to edit it in place. The list decides each row's
 * layout (goalListLayouts) so a section keeps one rhythm: inline rows read
 * checks-first on one line, stacked rows take two ruled lines — star + title,
 * then the checks beneath the title.
 */
export function GoalRow({ entry, layout }: { entry: GoalEntry; layout: GoalRowLayout }) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [titleHeight, setTitleHeight] = useState(0);

  if (editing) {
    return <GoalRowEditor entry={entry} onDone={() => setEditing(false)} />;
  }

  const measureTitle = (e: LayoutChangeEvent) => setTitleHeight(e.nativeEvent.layout.height);
  // A wrapped inline title is the row's tallest child, so the star must anchor
  // to the first text line instead of centering against the whole block.
  const titleWrapped = titleHeight > BODY_LINE_HEIGHT * 1.5;

  if (layout === 'stacked') {
    return (
      <View style={[styles.row, styles.rowStacked, { borderBottomColor: theme.rule }]}>
        <StarButton entry={entry} style={styles.starFirstLine} />
        <View style={styles.stackedBody}>
          <TitleButton entry={entry} onEdit={() => setEditing(true)} />
          <ChecksGroup entry={entry} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { borderBottomColor: theme.rule }]}>
      <StarButton entry={entry} style={titleWrapped ? styles.starFirstLine : undefined} />
      <ChecksGroup entry={entry} />
      <TitleButton
        entry={entry}
        onEdit={() => setEditing(true)}
        onLayout={measureTitle}
        style={styles.titlePress}
      />
    </View>
  );
}

function StarButton({ entry, style }: { entry: GoalEntry; style?: StyleProp<ViewStyle> }) {
  const toggleStar = useGoalsStore((s) => s.toggleStar);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        entry.starred ? `Unstar ${entry.title}` : `Star ${entry.title} as a key goal`
      }
      hitSlop={8}
      style={style}
      onPress={() => {
        selectionTap();
        // Soften the float-to-top reorder; LayoutAnimation is a no-op on web.
        if (Platform.OS !== 'web') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        toggleStar(entry.id);
      }}>
      <ThemedText
        type="subtitle"
        themeColor={entry.starred ? 'accent' : 'border'}
        style={styles.star}>
        {entry.starred ? '★' : '☆'}
      </ThemedText>
    </Pressable>
  );
}

function ChecksGroup({ entry }: { entry: GoalEntry }) {
  const cycleCheck = useGoalsStore((s) => s.cycleCheck);

  return (
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
  );
}

function TitleButton({
  entry,
  onEdit,
  onLayout,
  style,
}: {
  entry: GoalEntry;
  onEdit: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      style={style}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${entry.title}`}
      onPress={onEdit}>
      <ThemedText>{entry.title}</ThemedText>
    </Pressable>
  );
}

function GoalRowEditor({ entry, onDone }: { entry: GoalEntry; onDone: () => void }) {
  const updateGoal = useGoalsStore((s) => s.updateGoal);
  const removeGoal = useGoalsStore((s) => s.removeGoal);
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
      initial={{ title: entry.title, targetCount: entry.checks.length }}
      placeholder="Goal title…"
      submitLabel="Save"
      style={styles.editor}
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
  star: {
    lineHeight: 28,
  },
  // Anchors the star to the title's first line: top-aligned, with the star's
  // 28pt line box centered on the 24pt text line.
  starFirstLine: {
    alignSelf: 'flex-start',
    marginTop: -2,
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
