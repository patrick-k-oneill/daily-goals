import { Platform, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();
  const webKnob: object | null =
    Platform.OS === 'web' ? { activeThumbColor: theme.onPrimary } : null;

  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        // Web renders no platform track, so the knob needs its own contrast;
        // react-native-web colors the on-state knob from activeThumbColor.
        thumbColor={Platform.OS === 'web' ? theme.text : undefined}
        {...webKnob}
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
