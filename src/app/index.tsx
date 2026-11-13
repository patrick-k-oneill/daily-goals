import { useState } from 'react';

import { Screen } from '@/components/ui/screen';
import { UpcomingEvents } from '@/features/events/components/upcoming-events';
import { GoalList } from '@/features/goals/components/goal-list';
import { GoalSectionHeader } from '@/features/goals/components/goal-section-header';
import { periodLabel } from '@/features/goals/logic';
import { GratitudeEditor } from '@/features/gratitude/components/gratitude-editor';
import { reflectionDateFor } from '@/features/gratitude/logic';
import { useToday } from '@/lib/clock';
import { addDays, type DayKey } from '@/lib/dates';

/**
 * The whole pad page, top to bottom, the way it's written every morning.
 * The ‹ chevron flips back to earlier pages; forward is capped at today.
 */
export default function TodayScreen() {
  const today = useToday();
  // null means today's page, so the page turns with the clock at midnight.
  const [pinnedDay, setPinnedDay] = useState<DayKey | null>(null);
  const day = pinnedDay ?? today;
  const isToday = day === today;

  const flipForward = () => {
    const next = addDays(day, 1);
    setPinnedDay(next === today ? null : next);
  };

  return (
    <Screen>
      <GoalSectionHeader
        cadence="daily"
        day={day}
        detail={periodLabel('daily', day)}
        detailHighlight={!isToday}
        onPrev={() => setPinnedDay(addDays(day, -1))}
        onNext={isToday ? undefined : flipForward}
        onDetailPress={isToday ? undefined : () => setPinnedDay(null)}
      />
      <GoalList cadence="daily" day={day} />

      <GoalSectionHeader cadence="weekly" day={day} detail={periodLabel('weekly', day)} />
      <GoalList cadence="weekly" day={day} />

      <GoalSectionHeader cadence="annual" day={day} detail={periodLabel('annual', day)} />
      <GoalList cadence="annual" day={day} />

      {isToday && <UpcomingEvents />}

      <GratitudeEditor reflectionDate={isToday ? reflectionDateFor(today) : day} />
    </Screen>
  );
}
