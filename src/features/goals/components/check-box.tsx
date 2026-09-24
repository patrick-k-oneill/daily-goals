import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { selectionTap } from '@/lib/haptics';

import type { CheckState } from '../types';

import { CHECK_BOX_SIZE } from './goal-row-layout';

const LABEL_LINE_HEIGHT = 12;

interface CheckBoxProps {
  state: CheckState;
  onCycle: () => void;
  /** Tiny label above the box, like Fitness's Legs/Push/Pull. */
  label?: string;
  /** Hold the label line open without a label, so a row's boxes stay level. */
  reserveLabelLine?: boolean;
  accessibilityLabel: string;
}

/** One pad checkbox. Tap cycles blank → ✓ done → ✕ missed → blank. */
export function CheckBox({
  state,
  onCycle,
  label,
  reserveLabelLine,
  accessibilityLabel,
}: CheckBoxProps) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      {!label && reserveLabelLine ? <View style={styles.labelLine} /> : null}
      <Pressable
        {...hoverProps}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state === 'done' }}
        accessibilityLabel={accessibilityLabel}
        hitSlop={6}
        onPress={() => {
          selectionTap();
          onCycle();
        }}
        style={({ pressed }) => [
          styles.box,
          { borderColor: hovered ? theme.text : theme.textSecondary },
          hovered && { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        {state === 'done' && <ThemedText style={styles.mark}>✓</ThemedText>}
        {state === 'missed' && (
          <ThemedText style={styles.mark} themeColor="missed">
            ✕
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  label: {
    fontSize: 10,
    lineHeight: LABEL_LINE_HEIGHT,
  },
  labelLine: {
    height: LABEL_LINE_HEIGHT,
  },
  box: {
    width: CHECK_BOX_SIZE,
    height: CHECK_BOX_SIZE,
    borderWidth: 1.5,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  mark: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: 700,
  },
});
