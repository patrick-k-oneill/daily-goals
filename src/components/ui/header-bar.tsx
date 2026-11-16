import type { ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTextScale } from '@/features/text-size/store';
import { useHover } from '@/hooks/use-hover';

const BAR_HEIGHT = 40;

export function HeaderBar({ children }: { children: ReactNode }) {
  const scale = useTextScale();
  return <View style={[styles.bar, { minHeight: BAR_HEIGHT * scale }]}>{children}</View>;
}

interface HeaderButtonProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  themeColor?: ThemeColor;
  type?: ThemedTextProps['type'];
  ref?: Ref<View>;
}

export function HeaderButton({
  label,
  accessibilityLabel,
  onPress,
  themeColor = 'textSecondary',
  type = 'handSmall',
  ref,
}: HeaderButtonProps) {
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type={type} themeColor={hovered ? 'text' : themeColor}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
