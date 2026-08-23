import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SectionHeaderProps {
  title: string;
  /** Date, week range, or year — sits small at the top-left like the corner of the page. */
  detail?: string;
  /** Flip to the previous page. Renders a ‹ chevron beside the detail. */
  onPrev?: () => void;
  /** Flip to the next page. Renders a › chevron beside the detail. */
  onNext?: () => void;
  /** Tap the detail itself (e.g. jump back to today). */
  onDetailPress?: () => void;
  /** Render the detail in the accent color — signals "not today's page". */
  detailHighlight?: boolean;
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
            accessibilityLabel={onDetailPress ? `${detail} — back to today` : detail}
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'flex-start',
  },
  title: {
    textAlign: 'center',
  },
});
