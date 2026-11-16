import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Layout } from '@/constants/theme';
import { scaleLengths } from '@/features/text-size/logic';
import { useTextScale } from '@/features/text-size/store';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { selectionTap } from '@/lib/haptics';

const TRACK = { width: 50, height: 30 };
const KNOB_INSET = 3;
const SLIDE_MS = 140;

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}

export function ToggleSwitch({ value, onValueChange, accessibilityLabel }: ToggleSwitchProps) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();
  const scale = useTextScale();
  const track = scaleLengths(TRACK, scale);
  const knobInset = KNOB_INSET * scale;
  const knobSize = track.height - 2 * (Layout.primaryEdgeWidth + knobInset);
  const knobTravel = track.width - track.height;
  const slide = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    slide.set(withTiming(value ? 1 : 0, { duration: SLIDE_MS }));
  }, [value, slide]);

  const knobPosition = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.get() * knobTravel }],
  }));

  const trackColors = value
    ? {
        backgroundColor: hovered ? theme.primaryPressed : theme.primary,
        borderColor: theme.primaryEdge,
      }
    : {
        backgroundColor: theme.backgroundElement,
        borderColor: hovered ? theme.textSecondary : theme.border,
      };

  return (
    <Pressable
      {...hoverProps}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        selectionTap();
        onValueChange(!value);
      }}
      style={({ pressed }) => [
        styles.track,
        track,
        { borderRadius: track.height / 2, padding: knobInset },
        trackColors,
        pressed && styles.pressed,
      ]}>
      <Animated.View
        style={[
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            backgroundColor: value ? theme.onPrimary : theme.textSecondary,
          },
          knobPosition,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    borderWidth: Layout.primaryEdgeWidth,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
