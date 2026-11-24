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
  /** Sits after the title on its line, and under it when the line has no room. */
  accessory?: ReactNode;
}

export function SectionHeader({
  title,
  titleFlourish,
  titleInset = 0,
  accessory,
}: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.text }]}>
      <View style={styles.titleRow}>
        <View style={[styles.titleBox, { marginHorizontal: titleInset }]}>
          <ThemedText type="hand" style={styles.title} aria-live="polite">
            {title}
          </ThemedText>
          {titleFlourish}
        </View>
        {accessory}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
  },
  titleBox: {
    maxWidth: '100%',
  },
  title: {
    textAlign: 'center',
  },
});
