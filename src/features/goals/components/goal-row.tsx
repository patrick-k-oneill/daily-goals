import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CheckBox } from '@/components/ui/check-box';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { selectionTap } from '@/lib/haptics';

import { useGoalsStore } from '../store';
import type { GoalEntry } from '../types';

const MAX_TARGET = 10;

/**
 * One ruled line of the pad: margin star, the goal's checkboxes, then its
 * title. Tap the title to edit it in place.
 */
export function GoalRow({ entry }: { entry: GoalEntry }) {
  const theme = useTheme();
  const cycleCheck = useGoalsStore((s) => s.cycleCheck);
  const toggleStar = useGoalsStore((s) => s.toggleStar);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <GoalRowEditor entry={entry} onDone={() => setEditing(false)} />;
  }

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
        accessibilityRole="button"
        accessibilityLabel={`Edit ${entry.title}`}
        onPress={() => setEditing(true)}>
        <ThemedText>{entry.title}</ThemedText>
      </Pressable>
    </View>
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
            hitSlop={8}
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
            hitSlop={8}
            onPress={() => setTargetCount((n) => Math.min(MAX_TARGET, n + 1))}>
            <ThemedText type="subtitle" themeColor="textSecondary">
              +
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={save}
            style={[styles.saveButton, { backgroundColor: theme.accent }]}>
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
  saveLabel: {
    color: '#FFFFFF',
  },
  removePress: {
    alignSelf: 'flex-start',
  },
});
