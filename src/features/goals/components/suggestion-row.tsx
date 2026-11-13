import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/lib/clock';
import { selectionTap } from '@/lib/haptics';

import { suggestionNote, suggestionSourceId, suggestionsFor } from '../logic';
import { useRemindersStore } from '../reminders-store';
import { useGoalsStore } from '../store';
import type { Cadence, Suggestion } from '../types';

/** The sections that offer suggestions. */
const SUGGESTING_CADENCES: readonly Cadence[] = ['daily'];

/** Ink at this opacity reads as pencil beside a written line, and stays legible on both papers. */
const SUGGESTION_OPACITY = 0.65;

const ACTION_SIZE = 44;

/**
 * A section's suggestions, one row each, between its last line and the next
 * blank one. Renders nothing on a past page or in a section that offers none.
 */
export function SuggestionRows({ cadence, periodKey }: { cadence: Cadence; periodKey: string }) {
  const today = useToday();
  const entries = useGoalsStore((s) => s.entries);
  const tombstones = useGoalsStore((s) => s.tombstones);
  const declinedSuggestions = useGoalsStore((s) => s.declinedSuggestions);
  const reminders = useRemindersStore((s) => s.reminders);
  if (!SUGGESTING_CADENCES.includes(cadence)) return null;

  const pad = { entries, tombstones, declinedSuggestions };
  const suggestions = suggestionsFor(pad, cadence, periodKey, today, reminders);
  return suggestions.map((suggestion) => (
    <SuggestionRow
      key={suggestionSourceId(suggestion)}
      suggestion={suggestion}
      periodKey={periodKey}
      note={suggestionNote(suggestion, today)}
    />
  ));
}

/**
 * A goal the pad offers, pencilled rather than written: its title and where
 * it comes from, faded, with no checks, then Add (+) and Decline (×).
 */
function SuggestionRow({
  suggestion,
  periodKey,
  note,
}: {
  suggestion: Suggestion;
  periodKey: string;
  note: string;
}) {
  const theme = useTheme();
  const acceptSuggestion = useGoalsStore((s) => s.acceptSuggestion);
  const declineSuggestion = useGoalsStore((s) => s.declineSuggestion);

  return (
    <View style={[styles.row, { borderBottomColor: theme.rule }]}>
      <View
        accessible
        accessibilityLabel={`Suggested goal: ${suggestion.title}, ${note}`}
        style={styles.pencilled}>
        <ThemedText>{suggestion.title}</ThemedText>
        <ThemedText type="small">{note}</ThemedText>
      </View>
      <SuggestionAction
        glyph="+"
        themeColor="text"
        accessibilityLabel="Add this goal to today"
        onPress={() => {
          selectionTap();
          acceptSuggestion(suggestion, periodKey);
        }}
      />
      <SuggestionAction
        glyph="×"
        themeColor="textSecondary"
        accessibilityLabel="Decline this suggestion"
        onPress={() => declineSuggestion(suggestionSourceId(suggestion))}
      />
    </View>
  );
}

function SuggestionAction({
  glyph,
  themeColor,
  accessibilityLabel,
  onPress,
}: {
  glyph: string;
  themeColor: ThemeColor;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        hovered && { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="subtitle" themeColor={themeColor}>
        {glyph}
      </ThemedText>
    </Pressable>
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
  pencilled: {
    flex: 1,
    opacity: SUGGESTION_OPACITY,
  },
  action: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
