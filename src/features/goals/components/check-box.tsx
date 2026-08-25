import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { selectionTap } from '@/lib/haptics';

import type { CheckState } from '../types';

import { CHECK_BOX_SIZE } from './goal-row-layout';

interface CheckBoxProps {
  state: CheckState;
  onCycle: () => void;
  /** Tiny label above the box, like Fitness's Legs/Push/Pull. */
  label?: string;
  accessibilityLabel: string;
}

/** One pad checkbox. Tap cycles blank → ✓ done → ✕ missed → blank. */
export function CheckBox({ state, onCycle, label, accessibilityLabel }: CheckBoxProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <Pressable
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
          { borderColor: theme.textSecondary },
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
    lineHeight: 12,
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
