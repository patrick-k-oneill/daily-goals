import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTextScale } from '@/features/text-size/store';
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

/** The toggle's diameter at 100%; it grows with the text size. */
const TOGGLE_SIZE = 30;
/** A cell's width at 100%: narrow enough for seven to sit on one line of a phone-width form. */
const CELL_WIDTH = 40;

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
  const scale = useTextScale();
  // The circle grows with its letter so the glyph never spills past the border.
  const diameter = TOGGLE_SIZE * scale;
  const toggleSize = { width: diameter, height: diameter, borderRadius: diameter / 2 };

  return (
    <Pressable
      {...hoverProps}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        { width: CELL_WIDTH * scale },
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.toggle,
          toggleSize,
          checked
            ? { backgroundColor: theme.primary, borderColor: theme.primaryEdge }
            : { borderColor: hovered ? theme.textSecondary : theme.border },
          !checked && hovered && { backgroundColor: theme.backgroundElement },
        ]}>
        <ThemedText type="smallBold" themeColor={checked ? 'onPrimary' : 'textSecondary'}>
          {letter}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Wraps once the cells outgrow the form's width at a larger text size.
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.half,
    alignSelf: 'flex-start',
  },
  // A real 44pt-tall tap target (hitSlop doesn't extend DOM hit areas on web).
  cell: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
