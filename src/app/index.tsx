import { useRouter } from 'expo-router';
import { useState } from 'react';

import { PageHeader } from '@/components/ui/page-header';
import { Screen } from '@/components/ui/screen';
import { GoalList } from '@/features/goals/components/goal-list';
import { GoalSectionHeader } from '@/features/goals/components/goal-section-header';
import { GratitudeEditor } from '@/features/gratitude/components/gratitude-editor';
import { reflectionDateFor } from '@/features/gratitude/logic';
import { useMorningReminderTap } from '@/features/morning-reminder/store';
import { useToday } from '@/lib/clock';
import type { DayKey } from '@/lib/dates';

/**
 * The whole pad page, top to bottom, the way it's written every morning.
 * The ‹ chevron flips back to earlier pages and the date opens a date picker;
 * neither goes past today.
 */
export default function TodayScreen() {
  const router = useRouter();
  const today = useToday();
  // null means today's page, so the page turns with the clock at midnight.
  const [pinnedDay, setPinnedDay] = useState<DayKey | null>(null);
  const day = pinnedDay ?? today;
  const isToday = day === today;

  const showDay = (next: DayKey) => setPinnedDay(next === today ? null : next);
  useMorningReminderTap(() => {
    setPinnedDay(null);
    if (router.canDismiss()) router.dismissAll();
  });

  return (
    <Screen
      header={
        <PageHeader
          day={day}
          today={today}
          onShowDay={showDay}
          onOpenSettings={() => router.navigate('/settings')}
        />
      }>
      <GoalSectionHeader cadence="daily" day={day} />
      <GoalList cadence="daily" day={day} />

      <GoalSectionHeader cadence="weekly" day={day} />
      <GoalList cadence="weekly" day={day} />

      <GoalSectionHeader cadence="annual" day={day} />
      <GoalList cadence="annual" day={day} />

      <GratitudeEditor reflectionDate={isToday ? reflectionDateFor(today) : day} />
    </Screen>
  );
}
