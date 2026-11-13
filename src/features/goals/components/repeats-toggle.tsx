import { useState } from 'react';
import { Platform, StyleSheet, Switch, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { isDefaultTextScale } from '@/features/text-size/logic';
import { useTextScale } from '@/features/text-size/store';
import { useTheme } from '@/hooks/use-theme';

interface RepeatsToggleProps {
  value: boolean;
  onValueChange: (repeats: boolean) => void;
}

/** The goal form's Repeats switch: on, the goal is written again every new period. */
export function RepeatsToggle({ value, onValueChange }: RepeatsToggleProps) {
  const theme = useTheme();
  const scale = useTextScale();
  const [switchSize, setSwitchSize] = useState({ width: 0, height: 0 });

  const measure = ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
    setSwitchSize((known) =>
      known.width === layout.width && known.height === layout.height
        ? known
        : { width: layout.width, height: layout.height },
    );
  // The platform switch comes in one size: it is drawn larger, and the margins
  // give the row the room its drawn size takes.
  const grown = isDefaultTextScale(scale)
    ? undefined
    : {
        transform: [{ scale }],
        marginHorizontal: (switchSize.width * (scale - 1)) / 2,
        marginVertical: (switchSize.height * (scale - 1)) / 2,
      };

  return (
    <View style={styles.toggle}>
      <ThemedText type="small" themeColor="textSecondary">
        Repeats
      </ThemedText>
      <View style={grown} onLayout={measure}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.border, true: theme.primary }}
          // Web renders no platform track, so the knob needs its own contrast.
          thumbColor={Platform.OS === 'web' ? theme.text : undefined}
          accessibilityLabel="Repeats"
        />
      </View>
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
