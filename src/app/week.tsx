import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { GoalList } from '@/features/goals/components/goal-list';
import { formatWeekRange, todayKey, weekKeyOf, yearKeyOf } from '@/lib/dates';

export default function WeekScreen() {
  const today = todayKey();

  return (
    <Screen>
      <SectionHeader title="Weekly Goals" detail={formatWeekRange(today)} />
      <GoalList cadence="weekly" periodKey={weekKeyOf(today)} />

      <SectionHeader title="Annual Goals" detail={yearKeyOf(today)} />
      <GoalList cadence="annual" periodKey={yearKeyOf(today)} />
    </Screen>
  );
}
