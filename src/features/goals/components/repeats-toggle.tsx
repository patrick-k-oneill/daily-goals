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

  return (
    <View style={styles.toggle}>
      <ThemedText type="small" themeColor="textSecondary">
        Repeats
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.accent }}
        // Web renders no platform track, so the knob needs its own contrast.
        thumbColor={Platform.OS === 'web' ? theme.text : undefined}
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
