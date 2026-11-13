import { useEffect } from 'react';
import { Easing, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { SectionHeader, type SectionHeaderProps } from '@/components/ui/section-header';
import { announce } from '@/lib/announce';
import { nowStamp } from '@/lib/clock';
import type { DayKey } from '@/lib/dates';
import { successBuzz } from '@/lib/haptics';

import { msUntilSettled, periodKeyFor, sectionStatus, sectionTitle } from '../logic';
import { useRewardsStore } from '../rewards-store';
import { useGoalsStore } from '../store';
import type { Cadence } from '../types';

import { AchievedFlourish } from './achieved-flourish';

const REWARD_MOMENT_MS = 1100;

type GoalSectionHeaderProps = Omit<SectionHeaderProps, 'title' | 'titleFlourish'> & {
  cadence: Cadence;
  day: DayKey;
};

/**
 * The header of one cadence's section for the period containing `day`. It
 * reads "… Achieved!" once the section is. While a section a check tap just
 * completed is settling it keeps its plain name, then settles it: the header
 * changes, and the reward moment plays when one is due.
 */
export function GoalSectionHeader({ cadence, day, ...header }: GoalSectionHeaderProps) {
  const periodKey = periodKeyFor(cadence, day);
  const entries = useGoalsStore((s) => s.entries);
  const settling = useRewardsStore((s) => s.settling);
  const settleSection = useRewardsStore((s) => s.settleSection);
  const isMotionReduced = useReducedMotion();
  // 0 → 1 as the reward moment plays; at 1 the flourish sits as drawn.
  const moment = useSharedValue(1);

  const status = sectionStatus(settling, entries, periodKey);
  const settlingSince = settling[periodKey];

  useEffect(() => {
    if (settlingSince === undefined) return;

    let timer: ReturnType<typeof setTimeout>;
    const settle = () => {
      const outcome = settleSection(useGoalsStore.getState().entries, periodKey);
      if (outcome === 'waiting') {
        waitToSettle();
        return;
      }
      if (outcome === 'lapsed') return;

      announce(sectionTitle(cadence, 'achieved'));
      if (outcome !== 'rewarded') return;
      successBuzz();
      if (isMotionReduced) return;
      moment.set(0);
      moment.set(withTiming(1, { duration: REWARD_MOMENT_MS, easing: Easing.linear }));
    };
    const waitToSettle = () => {
      timer = setTimeout(settle, msUntilSettled(settlingSince, nowStamp()));
    };

    waitToSettle();
    return () => clearTimeout(timer);
  }, [settlingSince, periodKey, cadence, settleSection, isMotionReduced, moment]);

  return (
    <SectionHeader
      title={sectionTitle(cadence, status)}
      titleFlourish={status === 'achieved' ? <AchievedFlourish moment={moment} /> : null}
      {...header}
    />
  );
}
