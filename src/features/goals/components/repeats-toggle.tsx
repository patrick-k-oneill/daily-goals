import { Platform, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface RepeatsToggleProps {
  value: boolean;
  onValueChange: (repeats: boolean) => void;
}

/** The goal form's Repeats switch: on, the goal is written again every new period. */
export function RepeatsToggle({ value, onValueChange }: RepeatsToggleProps) {
  const theme = useTheme();
  const webKnob: object | null =
    Platform.OS === 'web' ? { activeThumbColor: theme.onPrimary } : null;

  return (
    <View style={styles.toggle}>
      <ThemedText type="small" themeColor="textSecondary">
        Repeats
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        // Web renders no platform track, so the knob needs its own contrast;
        // react-native-web colors the on-state knob from activeThumbColor.
        thumbColor={Platform.OS === 'web' ? theme.text : undefined}
        {...webKnob}
        accessibilityLabel="Repeats"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
