import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong } from '@/lib/dates';

import { currentReflectionDate, currentStreak } from '../logic';
import { useGratitudeStore } from '../store';

/**
 * The morning ritual card: written today, about yesterday — exactly like
 * writing on the previous day's pad page. Fully controlled by the store, so
 * every mount of the same reflection date (Today page + Journal) shares one
 * source of truth and stays in live sync; zustand persist saves each edit.
 * Pass `reflectionDate` to edit a past page's entry instead.
 */
export function GratitudeEditor({ reflectionDate: forDate }: { reflectionDate?: string }) {
  const theme = useTheme();
  const hydrated = useGratitudeStore((s) => s.hydrated);
  const entries = useGratitudeStore((s) => s.entries);
  const saveEntry = useGratitudeStore((s) => s.saveEntry);

  const reflectionDate = forDate ?? currentReflectionDate();
  if (!hydrated) return null;

  const text = entries[reflectionDate]?.text ?? '';
  const streak = currentStreak(entries, reflectionDate);

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
        onChangeText={(next) => saveEntry(reflectionDate, next)}
        multiline
        placeholder="Amy, Leto, sharing a great night, eating tasty food…"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        accessibilityLabel="Gratitude journal entry"
      />

      {text.trim().length > 0 && (
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
