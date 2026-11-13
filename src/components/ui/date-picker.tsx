import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AddLine, InlineForm } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';
import { scaleTextStyle } from '@/features/text-size/logic';
import { useTextScale } from '@/features/text-size/store';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import {
  addMonths,
  formatDayLong,
  formatMonth,
  monthGrid,
  monthStart,
  parseDayKey,
  type DayKey,
} from '@/lib/dates';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A day cell's height at 100%: a full tap target. It grows with the text size. */
const DAY_CELL_HEIGHT = 44;

interface DatePickerProps {
  selected: DayKey;
  /** The last day that can be picked. */
  today: DayKey;
  onSelect: (day: DayKey) => void;
}

/** A month grid for picking a day up to today, opening on the selected day's month. */
export function DatePicker({ selected, today, onSelect }: DatePickerProps) {
  const scale = useTextScale();
  const [month, setMonth] = useState(() => monthStart(selected));
  const isLatestMonth = month >= monthStart(today);

  return (
    <InlineForm style={styles.picker}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={10}
          onPress={() => setMonth(addMonths(month, -1))}>
          <ThemedText type="handSmall" themeColor="textSecondary">
            ‹
          </ThemedText>
        </Pressable>
        <ThemedText type="handSmall">{formatMonth(month)}</ThemedText>
        {isLatestMonth ? (
          <View style={{ width: Spacing.three * scale }} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            hitSlop={10}
            onPress={() => setMonth(addMonths(month, 1))}>
            <ThemedText type="handSmall" themeColor="textSecondary">
              ›
            </ThemedText>
          </Pressable>
        )}
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_INITIALS.map((initial, i) => (
          <ThemedText
            // Fixed weekday header — position is the identity.
            // react-doctor-disable-next-line react-doctor/no-array-index-as-key
            key={i}
            type="small"
            themeColor="textSecondary"
            style={scaleTextStyle(styles.weekdayLabel, scale)}>
            {initial}
          </ThemedText>
        ))}
      </View>

      {monthGrid(month).map((week) => (
        <View key={week.find(Boolean) ?? 'lead'} style={styles.weekRow}>
          {week.map((day, i) =>
            day ? (
              <DayCell
                key={day}
                day={day}
                isToday={day === today}
                isSelected={day === selected}
                isPickable={day <= today}
                onPress={() => onSelect(day)}
              />
            ) : (
              // Blank grid cell — position is the identity.
              // react-doctor-disable-next-line react-doctor/no-array-index-as-key
              <View key={i} style={[styles.dayCell, { minHeight: DAY_CELL_HEIGHT * scale }]} />
            ),
          )}
        </View>
      ))}

      {selected !== today && (
        <AddLine
          label="Back to today"
          accessibilityLabel="Back to today’s page"
          onPress={() => onSelect(today)}
        />
      )}
    </InlineForm>
  );
}

function DayCell({
  day,
  isToday,
  isSelected,
  isPickable,
  onPress,
}: {
  day: DayKey;
  isToday: boolean;
  isSelected: boolean;
  isPickable: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();
  const scale = useTextScale();

  return (
    <Pressable
      {...hoverProps}
      disabled={!isPickable}
      accessibilityRole="button"
      accessibilityLabel={`${formatDayLong(day)}${isToday ? ', today' : ''}`}
      accessibilityState={{ selected: isSelected, disabled: !isPickable }}
      onPress={onPress}
      style={[
        styles.dayCell,
        { minHeight: DAY_CELL_HEIGHT * scale },
        hovered && { backgroundColor: theme.backgroundElement },
        isSelected && { backgroundColor: theme.backgroundSelected },
      ]}>
      <ThemedText
        type="small"
        // Today gets the accent so it stands apart from the days after it.
        themeColor={isToday ? 'accent' : isPickable ? 'text' : 'border'}>
        {parseDayKey(day).getDate()}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: Spacing.one,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
  },
});
