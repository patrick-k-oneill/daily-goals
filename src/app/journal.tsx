import { useRef, useState } from 'react';
import { View, type ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { GratitudeCard } from '@/features/gratitude/components/gratitude-card';
import { GratitudeEditor } from '@/features/gratitude/components/gratitude-editor';
import { JournalCalendar } from '@/features/gratitude/components/journal-calendar';
import { currentReflectionDate, sortedEntries } from '@/features/gratitude/logic';
import { useGratitudeStore } from '@/features/gratitude/store';
import { Spacing } from '@/constants/theme';
import { formatPadDate, todayKey, type DayKey } from '@/lib/dates';

export default function JournalScreen() {
  const entries = useGratitudeStore((s) => s.entries);
  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const reflectionDate = currentReflectionDate();
  const history = sortedEntries(entries).filter((e) => e.forDate !== reflectionDate);

  // The current morning's editor already sits at the top of the page — point
  // at it instead of selecting a second editor for the same entry. Instant
  // scroll: a smooth one gets canceled when the catch-up editor unmounts and
  // the browser clamps the shortened page, and 0 is valid at any height.
  const selectDay = (day: DayKey | null) => {
    if (day === reflectionDate) {
      setSelectedDay(null);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    setSelectedDay(day);
  };

  return (
    <Screen scrollRef={scrollRef}>
      <SectionHeader title="Gratitude Journal" detail={formatPadDate(todayKey())} />
      <GratitudeEditor reflectionDate={reflectionDate} />

      <View style={{ gap: Spacing.three }}>
        <ThemedText type="handSmall" themeColor="textSecondary">
          Past mornings
        </ThemedText>
        <JournalCalendar selected={selectedDay} onSelectDay={selectDay} />
        {selectedDay && selectedDay !== reflectionDate && (
          <GratitudeEditor reflectionDate={selectedDay} />
        )}
      </View>

      {history.length > 0 && (
        <View style={{ gap: Spacing.two }}>
          {history.map((entry) => (
            <GratitudeCard key={entry.forDate} entry={entry} />
          ))}
        </View>
      )}
    </Screen>
  );
}
