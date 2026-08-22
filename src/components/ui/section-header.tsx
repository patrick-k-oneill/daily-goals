import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Handwritten, underlined heading — "Daily Goals" with the date off to the side. */
export function SectionHeader({ title, detail }: { title: string; detail?: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: theme.text }]}>
      <ThemedText type="hand">{title}</ThemedText>
      {detail ? (
        <ThemedText type="handSmall" themeColor="textSecondary">
          {detail}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderBottomWidth: 2,
    paddingBottom: Spacing.one,
  },
});
