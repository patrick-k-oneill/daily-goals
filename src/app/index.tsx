import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { UpcomingEvents } from '@/features/events/components/upcoming-events';
import { GoalList } from '@/features/goals/components/goal-list';
import { JournalNudge } from '@/features/gratitude/components/journal-nudge';
import { formatPadDate, todayKey } from '@/lib/dates';

export default function TodayScreen() {
  const today = todayKey();

  return (
    <Screen>
      <SectionHeader title="Daily Goals" detail={formatPadDate(today)} />
      <GoalList cadence="daily" periodKey={today} />
      <JournalNudge />
      <UpcomingEvents />
    </Screen>
  );
}
