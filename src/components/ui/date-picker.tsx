import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/form';
import { Spacing } from '@/constants/theme';
import { scaleTextStyle } from '@/features/text-size/logic';
import { useTextScale } from '@/features/text-size/store';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
const DAY_MARK_SIZE = 34;

export const DATE_PICKER_WIDTH = 304;

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
    <View style={styles.picker}>
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

      {selected !== today && <GoToToday onPress={() => onSelect(today)} />}
    </View>
  );
}

const GO_TO_TODAY = 'Go to Today';
const GO_TO_TODAY_LABEL = 'Go to today’s page';

function GoToToday({ onPress }: { onPress: () => void }) {
  const { hovered, hoverProps } = useHover();
  const isYellowReadableOnPage = useColorScheme() === 'dark';

  if (!isYellowReadableOnPage) {
    return (
      <View style={styles.goToTodayPill}>
        <PrimaryButton
          label={GO_TO_TODAY}
          accessibilityLabel={GO_TO_TODAY_LABEL}
          onPress={onPress}
        />
      </View>
    );
  }

  return (
    <Pressable
      {...hoverProps}
      accessibilityRole="button"
      accessibilityLabel={GO_TO_TODAY_LABEL}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.goToToday, (pressed || hovered) && styles.goToTodayActive]}>
      <ThemedText type="smallBold" themeColor="primary">
        {GO_TO_TODAY}
      </ThemedText>
    </Pressable>
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
  const markSize = DAY_MARK_SIZE * scale;

  return (
    <Pressable
      {...hoverProps}
      disabled={!isPickable}
      accessibilityRole="button"
      accessibilityLabel={`${formatDayLong(day)}${isToday ? ', today' : ''}`}
      accessibilityState={{ selected: isSelected, disabled: !isPickable }}
      onPress={onPress}
      style={[styles.dayCell, { minHeight: DAY_CELL_HEIGHT * scale }]}>
      <View
        style={[
          styles.dayMark,
          { width: markSize, height: markSize, borderRadius: markSize / 2 },
          hovered && { backgroundColor: theme.backgroundElement },
          isSelected && { backgroundColor: theme.backgroundSelected },
        ]}>
        <ThemedText
          type={isToday ? 'smallBold' : 'small'}
          themeColor={isToday ? 'primaryEdge' : isPickable ? 'text' : 'border'}>
          {parseDayKey(day).getDate()}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: Spacing.one,
    padding: Spacing.one,
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
  },
  dayMark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goToToday: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  goToTodayActive: {
    opacity: 0.6,
  },
  goToTodayPill: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
  },
});
