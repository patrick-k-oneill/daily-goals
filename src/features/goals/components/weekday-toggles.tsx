import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { selectionTap } from '@/lib/haptics';

/** ISO order, Monday first; `day` matches `weekdayOf` in lib/dates. */
const WEEKDAYS = [
  { day: 1, letter: 'M', name: 'Monday' },
  { day: 2, letter: 'T', name: 'Tuesday' },
  { day: 3, letter: 'W', name: 'Wednesday' },
  { day: 4, letter: 'T', name: 'Thursday' },
  { day: 5, letter: 'F', name: 'Friday' },
  { day: 6, letter: 'S', name: 'Saturday' },
  { day: 7, letter: 'S', name: 'Sunday' },
] as const;

const TOGGLE_SIZE = 30;

interface WeekdayTogglesProps {
  /** The ISO weekdays currently on. */
  value: readonly number[];
  onChange: (weekdays: number[]) => void;
}

/** The M T W T F S S row of a repeating daily goal: one checkbox per weekday, ink-filled when on. */
export function WeekdayToggles({ value, onChange }: WeekdayTogglesProps) {
  const toggle = (day: number) => {
    selectionTap();
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);
  };

  return (
    <View style={styles.row}>
      {WEEKDAYS.map((weekday) => (
        <WeekdayToggle
          key={weekday.day}
          letter={weekday.letter}
          name={weekday.name}
          checked={value.includes(weekday.day)}
          onPress={() => toggle(weekday.day)}
        />
      ))}
    </View>
  );
}

function WeekdayToggle({
  letter,
  name,
  checked,
  onPress,
}: {
  letter: string;
  name: string;
  checked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      {...hoverProps}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      <View
        style={[
          styles.toggle,
          checked
            ? { backgroundColor: theme.accent, borderColor: theme.accent }
            : { borderColor: hovered ? theme.textSecondary : theme.border },
          !checked && hovered && { backgroundColor: theme.backgroundElement },
        ]}>
        <ThemedText type="smallBold" themeColor={checked ? 'onAccent' : 'textSecondary'}>
          {letter}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.half,
    alignSelf: 'flex-start',
  },
  // A real 44pt-tall tap target (hitSlop doesn't extend DOM hit areas on web),
  // narrow enough for seven to sit on one line of a phone-width form.
  cell: {
    width: 40,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: TOGGLE_SIZE,
    height: TOGGLE_SIZE,
    borderRadius: TOGGLE_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
