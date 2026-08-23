import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addMonths,
  formatDayLong,
  formatMonth,
  monthGrid,
  monthStart,
  parseDayKey,
  todayKey,
  type DayKey,
} from '@/lib/dates';

import { useGratitudeStore } from '../store';

interface JournalCalendarProps {
  selected: DayKey | null;
  onSelectDay: (day: DayKey | null) => void;
}

/**
 * A month of mornings: a ✓ marks each day whose gratitude was written.
 * Tap any finished day to read or catch up on its entry.
 */
export function JournalCalendar({ selected, onSelectDay }: JournalCalendarProps) {
  const theme = useTheme();
  const entries = useGratitudeStore((s) => s.entries);

  const today = todayKey();
  const currentMonth = monthStart(today);
  const [month, setMonth] = useState(currentMonth);

  const atCurrentMonth = month === currentMonth;

  return (
    <View style={styles.container}>
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
        {atCurrentMonth ? (
          <View style={styles.chevronSpacer} />
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
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
          <ThemedText
            // Fixed weekday header — position is the identity.
            // react-doctor-disable-next-line react-doctor/no-array-index-as-key
            key={i}
            type="small"
            themeColor="textSecondary"
            style={styles.weekdayLabel}>
            {label}
          </ThemedText>
        ))}
      </View>

      {monthGrid(month).map((week) => (
        <View key={week.find(Boolean) ?? 'lead'} style={styles.weekRow}>
          {week.map((day, i) => {
            if (!day) {
              // Blank grid cell — position is the identity.
              // react-doctor-disable-next-line react-doctor/no-array-index-as-key
              return <View key={i} style={styles.dayCell} />;
            }

            const written = Boolean(entries[day]?.text.trim());
            const finished = day < today;
            const isSelected = day === selected;

            return (
              <Pressable
                key={day}
                disabled={!finished}
                accessibilityRole="button"
                accessibilityLabel={`${formatDayLong(day)}${written ? ', written' : ''}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectDay(isSelected ? null : day)}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: theme.backgroundSelected },
                ]}>
                <ThemedText
                  type="small"
                  themeColor={finished ? 'text' : 'border'}
                  style={styles.dayNumber}>
                  {parseDayKey(day).getDate()}
                </ThemedText>
                <ThemedText type="small" themeColor={written ? 'accent' : 'border'}>
                  {written ? '✓' : '·'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  chevronSpacer: {
    width: Spacing.three,
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
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    minHeight: 44,
  },
  dayNumber: {
    fontSize: 13,
    lineHeight: 16,
  },
});
