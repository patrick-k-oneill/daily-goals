import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { UpcomingEvents } from '@/features/events/components/upcoming-events';
import { GoalList } from '@/features/goals/components/goal-list';
import { GratitudeEditor } from '@/features/gratitude/components/gratitude-editor';
import { formatPadDate, formatWeekRange, todayKey, weekKeyOf, yearKeyOf } from '@/lib/dates';

/** The whole pad page, top to bottom, the way it's written every morning. */
export default function TodayScreen() {
  const today = todayKey();

  return (
    <Screen>
      <SectionHeader title="Daily Goals" detail={formatPadDate(today)} />
      <GoalList cadence="daily" periodKey={today} />

      <SectionHeader title="Weekly Goals" detail={formatWeekRange(today)} />
      <GoalList cadence="weekly" periodKey={weekKeyOf(today)} />

      <SectionHeader title="Annual Goals" detail={yearKeyOf(today)} />
      <GoalList cadence="annual" periodKey={yearKeyOf(today)} />

      <UpcomingEvents />

      <GratitudeEditor />
    </Screen>
  );
}
