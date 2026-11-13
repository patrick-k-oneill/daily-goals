import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SectionHeaderProps {
  title: string;
  /** The page's date — sits small at the top-left like the corner of the page. */
  detail?: string;
  /** Flip to the previous page. Renders a ‹ chevron beside the detail. */
  onPrev?: () => void;
  /** Flip to the next page. Renders a › chevron beside the detail. */
  onNext?: () => void;
  /** Tap the detail itself (e.g. open a date picker). */
  onDetailPress?: () => void;
  /** Render the detail in the accent color — signals "not today's page". */
  detailHighlight?: boolean;
  /** Marks drawn over the title, in a box the size of its text. */
  titleFlourish?: ReactNode;
}

/**
 * A pad section heading: detail top-left, handwritten title centered,
 * underline across the section. Optional chevrons flip between pages.
 */
export function SectionHeader({
  title,
  detail,
  onPrev,
  onNext,
  onDetailPress,
  detailHighlight,
  titleFlourish,
}: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.text }]}>
      {detail ? (
        <View style={styles.detailRow}>
          {onPrev && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous page"
              hitSlop={10}
              onPress={onPrev}>
              <ThemedText type="handSmall" themeColor="textSecondary">
                ‹
              </ThemedText>
            </Pressable>
          )}
          <Pressable
            disabled={!onDetailPress}
            accessibilityRole={onDetailPress ? 'button' : 'text'}
            accessibilityLabel={onDetailPress ? `${detail} — choose a day` : detail}
            hitSlop={6}
            onPress={onDetailPress}>
            <ThemedText type="handSmall" themeColor={detailHighlight ? 'accent' : 'textSecondary'}>
              {detail}
            </ThemedText>
          </Pressable>
          {onNext && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next page"
              hitSlop={10}
              onPress={onNext}>
              <ThemedText type="handSmall" themeColor="textSecondary">
                ›
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : null}
      <View style={styles.titleBox}>
        <ThemedText type="hand" style={styles.title} aria-live="polite">
          {title}
        </ThemedText>
        {titleFlourish}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 2,
    paddingBottom: Spacing.one,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'flex-start',
  },
  titleBox: {
    alignSelf: 'center',
    maxWidth: '100%',
  },
  title: {
    textAlign: 'center',
  },
});
