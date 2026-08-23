import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A pad section heading: the detail (date, week range, year) sits small at
 * the top-left like the corner of the page, the handwritten title is
 * centered, and the underline runs the width of the section.
 */
export function SectionHeader({ title, detail }: { title: string; detail?: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.text }]}>
      {detail ? (
        <ThemedText type="handSmall" themeColor="textSecondary">
          {detail}
        </ThemedText>
      ) : null}
      <ThemedText type="hand" style={styles.title}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 2,
    paddingBottom: Spacing.one,
  },
  title: {
    textAlign: 'center',
  },
});
