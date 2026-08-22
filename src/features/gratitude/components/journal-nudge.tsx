import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong } from '@/lib/dates';

import { currentReflectionDate } from '../logic';
import { useGratitudeStore } from '../store';

/** Shown on Today until this morning's gratitude is written. */
export function JournalNudge() {
  const theme = useTheme();
  const hydrated = useGratitudeStore((s) => s.hydrated);
  const entries = useGratitudeStore((s) => s.entries);

  const reflectionDate = currentReflectionDate();
  if (!hydrated || entries[reflectionDate]?.text.trim()) return null;

  return (
    <Link href="/journal" asChild>
      <Pressable accessibilityRole="link" accessibilityLabel="Open the gratitude journal">
        {({ pressed }) => (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.accent }, pressed && styles.pressed]}>
            <ThemedText type="handSmall">I am Grateful for…</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              This morning&apos;s journal is blank — write about {formatDayLong(reflectionDate)} →
            </ThemedText>
          </ThemedView>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
