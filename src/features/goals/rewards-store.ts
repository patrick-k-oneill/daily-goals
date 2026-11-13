import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { nowStamp } from '@/lib/clock';
import { todayKey } from '@/lib/dates';
import { persistOptions } from '@/lib/persisted-store';

import * as logic from './logic';
import type { GoalEntry, Rewards, SettleOutcome } from './types';

interface RewardsState extends Rewards {
  /** Follow a check tap on a line, given every line as the tap left them. */
  settleAfterTap: (entries: GoalEntry[], entryId: string) => void;
  /** Settle a period's section if its completing tap has rested, and say what came of it. */
  settleSection: (entries: GoalEntry[], periodKey: string) => SettleOutcome;
}

/**
 * This device's memory of its reward moments, a store of its own so it is in
 * no pad file and no merge. Each action is one pure transition from ./logic.
 * Nothing on a first render reads it, so the root layout does not wait for it
 * to rehydrate.
 */
export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      settling: {},
      played: {},

      settleAfterTap: (entries, entryId) =>
        set((rewards) => logic.settleAfterTap(rewards, entries, entryId, nowStamp())),
      settleSection: (entries, periodKey) => {
        const { rewards, outcome } = logic.settleSection(
          get(),
          entries,
          periodKey,
          todayKey(),
          nowStamp(),
        );
        set(rewards);
        return outcome;
      },
    }),
    persistOptions<RewardsState>('rewards', {
      // A section still settling when the app closed comes back achieved, with no reward moment.
      merge: (persisted, current) => ({
        ...current,
        played: (persisted as Partial<Rewards> | undefined)?.played ?? current.played,
      }),
    }),
  ),
);
