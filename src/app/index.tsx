import { useState } from 'react';

import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { PadFooter } from '@/features/backup/components/pad-footer';
import { GoalList } from '@/features/goals/components/goal-list';
import { GoalSectionHeader } from '@/features/goals/components/goal-section-header';
import { GratitudeEditor } from '@/features/gratitude/components/gratitude-editor';
import { reflectionDateFor } from '@/features/gratitude/logic';
import { useToday } from '@/lib/clock';
import { addDays, formatPadDate, type DayKey } from '@/lib/dates';

/**
 * The whole pad page, top to bottom, the way it's written every morning.
 * The ‹ chevron flips back to earlier pages and the date opens a date picker;
 * neither goes past today.
 */
export default function TodayScreen() {
  const today = useToday();
  // null means today's page, so the page turns with the clock at midnight.
  const [pinnedDay, setPinnedDay] = useState<DayKey | null>(null);
  const [isPickingDay, setIsPickingDay] = useState(false);
  const day = pinnedDay ?? today;
  const isToday = day === today;

  const showDay = (next: DayKey) => setPinnedDay(next === today ? null : next);

  return (
    <Screen>
      <GoalSectionHeader
        cadence="daily"
        day={day}
        detail={formatPadDate(day)}
        detailHighlight={!isToday}
        onPrev={() => showDay(addDays(day, -1))}
        onNext={isToday ? undefined : () => showDay(addDays(day, 1))}
        onDetailPress={() => setIsPickingDay((isOpen) => !isOpen)}
      />
      {isPickingDay && (
        <DatePicker
          // Remounts on the shown day's month when the page flips under an open picker.
          key={day}
          selected={day}
          today={today}
          onSelect={(picked) => {
            showDay(picked);
            setIsPickingDay(false);
          }}
        />
      )}
      <GoalList cadence="daily" day={day} />

      <GoalSectionHeader cadence="weekly" day={day} />
      <GoalList cadence="weekly" day={day} />

      <GoalSectionHeader cadence="annual" day={day} />
      <GoalList cadence="annual" day={day} />

      <GratitudeEditor reflectionDate={isToday ? reflectionDateFor(today) : day} />

      <PadFooter />
    </Screen>
  );
}
