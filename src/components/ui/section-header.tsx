import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SectionHeaderProps {
  title: string;
  /** Marks drawn over the title, in a box the size of its text. */
  titleFlourish?: ReactNode;
  /** Room kept clear either side of the title, for a flourish that overhangs it. */
  titleInset?: number;
}

export function SectionHeader({ title, titleFlourish, titleInset = 0 }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.text }]}>
      <View style={[styles.titleRow, { paddingHorizontal: titleInset }]}>
        <View style={styles.titleBox}>
          <ThemedText type="hand" style={styles.title} aria-live="polite">
            {title}
          </ThemedText>
          {titleFlourish}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 2,
    paddingBottom: Spacing.one,
  },
  titleRow: {
    alignItems: 'center',
  },
  titleBox: {
    maxWidth: '100%',
  },
  title: {
    textAlign: 'center',
  },
});
