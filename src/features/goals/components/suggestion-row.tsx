import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTextScale } from '@/features/text-size/store';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { useToday } from '@/lib/clock';
import { selectionTap } from '@/lib/haptics';

import { suggestionNote, suggestionsFor } from '../logic';
import { useGoalsStore } from '../store';
import type { Cadence, Suggestion } from '../types';

/** The sections that offer suggestions. */
const SUGGESTING_CADENCES: readonly Cadence[] = ['daily'];

/** Ink at this opacity reads as pencil beside a written line, and stays legible on both papers. */
const SUGGESTION_OPACITY = 0.65;

/** The room a suggestion's title needs beside + and × at 100%; with less, they move under it. */
const MIN_TITLE_WIDTH = 120;

/** The side of + and × at 100%: a full tap target. It grows with the glyph. */
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
  if (!SUGGESTING_CADENCES.includes(cadence)) return null;

  const pad = { entries, tombstones, declinedSuggestions };
  const suggestions = suggestionsFor(pad, cadence, periodKey, today);
  return suggestions.map((suggestion) => (
    <SuggestionRow
      key={suggestion.sourceEntryId}
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
  const scale = useTextScale();

  return (
    <View style={[styles.row, { borderBottomColor: theme.rule }]}>
      <View
        accessible
        accessibilityLabel={`Suggested goal: ${suggestion.title}, ${note}`}
        style={[styles.pencilled, { flexBasis: MIN_TITLE_WIDTH * scale }]}>
        <ThemedText>{suggestion.title}</ThemedText>
        <ThemedText type="small">{note}</ThemedText>
      </View>
      <View style={styles.actions}>
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
          onPress={() => declineSuggestion(suggestion.sourceEntryId)}
        />
      </View>
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
  const side = ACTION_SIZE * useTextScale();

  return (
    <Pressable
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { width: side, height: side },
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
  // + and × sit at the right of the title, or together under it once it needs the whole line.
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pencilled: {
    flexGrow: 1,
    flexShrink: 1,
    opacity: SUGGESTION_OPACITY,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
});
