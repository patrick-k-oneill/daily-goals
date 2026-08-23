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
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CheckBox } from '@/components/ui/check-box';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { selectionTap } from '@/lib/haptics';

import type { GoalRowLayout } from '../logic';
import { useGoalsStore } from '../store';
import type { GoalEntry } from '../types';

const MAX_TARGET = 10;

/** ThemedText's default lineHeight — one title line. */
const TITLE_LINE_HEIGHT = 24;

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
  const titleWrapped = titleHeight > TITLE_LINE_HEIGHT * 1.5;

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
  const theme = useTheme();
  const updateGoal = useGoalsStore((s) => s.updateGoal);
  const removeGoal = useGoalsStore((s) => s.removeGoal);

  // Draft snapshot, intentional: the editor mounts fresh per edit session and
  // nothing mutates the entry while it's open, so resyncing would be wrong.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [title, setTitle] = useState(entry.title);
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [targetCount, setTargetCount] = useState(entry.checks.length);

  const recurring = Boolean(entry.templateId);
  const canSave = Boolean(title.trim());

  const save = () => {
    updateGoal(entry.id, { title, targetCount });
    onDone();
  };

  const remove = () => {
    confirmAction(
      'Remove goal',
      recurring
        ? `Remove “${entry.title}” from this page and stop it repeating in future periods?`
        : `Remove “${entry.title}” from this page?`,
      () => removeGoal(entry.id, { stopRepeating: recurring }),
    );
  };

  return (
    <View style={[styles.editor, { borderColor: theme.border }]}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={save}
        placeholder="Goal title…"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderBottomColor: theme.rule }]}
        accessibilityLabel="Goal title"
      />

      <View style={styles.editorRow}>
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
            onPress={() => setTargetCount((n) => Math.min(MAX_TARGET, n + 1))}>
            <ThemedText type="subtitle" themeColor="textSecondary">
              +
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={save}
            style={[
              styles.saveButton,
              { backgroundColor: theme.accent },
              !canSave && styles.buttonDisabled,
            ]}>
            <ThemedText type="smallBold" style={styles.saveLabel}>
              Save
            </ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={remove} hitSlop={4} style={styles.removePress}>
        <ThemedText type="small" themeColor="missed">
          Remove{recurring ? ' & stop repeating' : ''}
        </ThemedText>
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
    gap: Spacing.one,
  },
  titlePress: {
    flex: 1,
    minWidth: 120,
  },
  editor: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    marginVertical: Spacing.one,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
  },
  editorRow: {
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  saveButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  saveLabel: {
    color: '#FFFFFF',
  },
  removePress: {
    alignSelf: 'flex-start',
  },
});
