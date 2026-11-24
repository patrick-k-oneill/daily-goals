import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** A small rounded tag in the margin's red, for a number worth a glance: a streak. */
export function Pill({ label }: { label: string }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.pill}>
      <ThemedText type="smallBold" themeColor="accent">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
});
