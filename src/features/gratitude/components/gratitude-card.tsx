import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLong } from '@/lib/dates';

import type { GratitudeEntry } from '../types';

/** A past page of the journal. */
export function GratitudeCard({ entry }: { entry: GratitudeEntry }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { borderBottomColor: theme.rule }]}>
      <ThemedText type="handSmall" themeColor="textSecondary">
        {formatDayLong(entry.forDate)}
      </ThemedText>
      <ThemedText>{entry.text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
