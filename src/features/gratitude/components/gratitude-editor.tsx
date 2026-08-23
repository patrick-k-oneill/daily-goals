import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong } from '@/lib/dates';

import { currentReflectionDate, currentStreak } from '../logic';
import { useGratitudeStore } from '../store';

const SAVE_DEBOUNCE_MS = 600;

/**
 * The morning ritual card: written today, about yesterday — exactly like
 * writing on the previous day's pad page. Autosaves as you write.
 * Pass `reflectionDate` to edit a past page's entry instead.
 */
export function GratitudeEditor({ reflectionDate: forDate }: { reflectionDate?: string }) {
  const hydrated = useGratitudeStore((s) => s.hydrated);
  const entries = useGratitudeStore((s) => s.entries);

  const reflectionDate = forDate ?? currentReflectionDate();
  if (!hydrated) return null;

  return (
    <EditorCard
      // Remount on rollover so the draft state starts from the new day's text.
      key={reflectionDate}
      reflectionDate={reflectionDate}
      initialText={entries[reflectionDate]?.text ?? ''}
    />
  );
}

function EditorCard({
  reflectionDate,
  initialText,
}: {
  reflectionDate: string;
  initialText: string;
}) {
  const theme = useTheme();
  const entries = useGratitudeStore((s) => s.entries);
  const saveEntry = useGratitudeStore((s) => s.saveEntry);

  const savedText = entries[reflectionDate]?.text ?? '';
  const streak = currentStreak(entries, reflectionDate);

  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (text === savedText) return;
    const timer = setTimeout(() => saveEntry(reflectionDate, text), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, savedText, reflectionDate, saveEntry]);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="hand">I am Grateful for:</ThemedText>
        {streak > 1 && (
          <ThemedView type="backgroundSelected" style={styles.streakPill}>
            <ThemedText type="smallBold" themeColor="accent">
              ★ {streak}-day streak
            </ThemedText>
          </ThemedView>
        )}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Reflecting on {formatDayLong(reflectionDate)}
      </ThemedText>

      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Amy, Leto, sharing a great night, eating tasty food…"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        accessibilityLabel="Gratitude journal entry"
      />

      {text === savedText && text.trim().length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.saved}>
          Saved ✓
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  streakPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  input: {
    minHeight: 140,
    fontSize: 17,
    lineHeight: 26,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  saved: {
    alignSelf: 'flex-end',
  },
});
