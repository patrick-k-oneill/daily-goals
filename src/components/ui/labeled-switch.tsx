import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Spacing } from '@/constants/theme';

interface LabeledSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** What a screen reader says for the switch; the label when omitted. */
  accessibilityLabel?: string;
}

/** A switch with its name in small secondary type before it. */
export function LabeledSwitch({
  label,
  value,
  onValueChange,
  accessibilityLabel = label,
}: LabeledSwitchProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ToggleSwitch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
