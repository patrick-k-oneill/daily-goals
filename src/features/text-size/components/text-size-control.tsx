import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { canEnlargeText, canShrinkText, formatTextScale, isDefaultTextScale } from '../logic';
import { useTextSizeStore } from '../store';

/** Room for "100%" in small bold type at 100%. */
const PERCENT_WIDTH = 40;

/** The footer's Text size row: A−, the percent, A+, and Reset once it is off 100%. */
export function TextSizeControl() {
  const scale = useTextSizeStore((s) => s.scale);
  const shrinkText = useTextSizeStore((s) => s.shrinkText);
  const enlargeText = useTextSizeStore((s) => s.enlargeText);
  const resetTextSize = useTextSizeStore((s) => s.resetTextSize);
  const percent = formatTextScale(scale);

  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" aria-hidden>
        Text size
      </ThemedText>
      <StepButton
        label="A−"
        accessibilityLabel="Smaller text"
        disabled={!canShrinkText(scale)}
        onPress={shrinkText}
      />
      <ThemedText
        type="smallBold"
        accessibilityLabel="Text size"
        accessibilityValue={{ text: percent }}
        style={[styles.percent, { minWidth: PERCENT_WIDTH * scale }]}>
        {percent}
      </ThemedText>
      <StepButton
        label="A+"
        accessibilityLabel="Larger text"
        disabled={!canEnlargeText(scale)}
        onPress={enlargeText}
      />
      {!isDefaultTextScale(scale) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset text size to 100%"
          hitSlop={8}
          style={styles.button}
          onPress={resetTextSize}>
          <ThemedText type="small" themeColor="textSecondary">
            Reset
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Wraps once a larger text size outgrows the page.
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.three,
  },
  button: {
    paddingVertical: Spacing.two,
  },
  disabled: {
    opacity: 0.4,
  },
  percent: {
    textAlign: 'center',
  },
});
