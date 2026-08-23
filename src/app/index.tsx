import { useState } from 'react';

import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { UpcomingEvents } from '@/features/events/components/upcoming-events';
import { GoalList } from '@/features/goals/components/goal-list';
import { GratitudeEditor } from '@/features/gratitude/components/gratitude-editor';
import { currentReflectionDate } from '@/features/gratitude/logic';
import {
  addDays,
  formatPadDate,
  formatWeekRange,
  todayKey,
  weekKeyOf,
  yearKeyOf,
} from '@/lib/dates';

/**
 * The whole pad page, top to bottom, the way it's written every morning.
 * The ‹ chevron flips back to earlier pages; forward is capped at today.
 */
export default function TodayScreen() {
  const today = todayKey();
  const [day, setDay] = useState(() => todayKey());
  const isToday = day === today;

  return (
    <Screen>
      <SectionHeader
        title="Daily Goals"
        detail={formatPadDate(day)}
        detailHighlight={!isToday}
        onPrev={() => setDay(addDays(day, -1))}
        onNext={isToday ? undefined : () => setDay(addDays(day, 1))}
        onDetailPress={isToday ? undefined : () => setDay(today)}
      />
      <GoalList cadence="daily" periodKey={day} />

      <SectionHeader title="Weekly Goals" detail={formatWeekRange(day)} />
      <GoalList cadence="weekly" periodKey={weekKeyOf(day)} />

      <SectionHeader title="Annual Goals" detail={yearKeyOf(day)} />
      <GoalList cadence="annual" periodKey={yearKeyOf(day)} />

      {isToday && <UpcomingEvents />}

      <GratitudeEditor reflectionDate={isToday ? currentReflectionDate() : day} />
    </Screen>
  );
}
