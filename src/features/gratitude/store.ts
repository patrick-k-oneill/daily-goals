import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { nowStamp } from '@/lib/clock';
import type { DayKey } from '@/lib/dates';
import { persistOptions } from '@/lib/persisted-store';

import * as logic from './logic';
import type { Gratitude, GratitudeEntries } from './types';

interface GratitudeState extends Gratitude {
  saveEntry: (forDate: DayKey, text: string) => void;
  /** Replace every morning with an imported pad's. */
  replaceGratitude: (gratitude: Gratitude) => void;
  /** Reconcile with another device's copy. */
  mergeGratitude: (remote: Gratitude) => void;
}

/** The gratitude feature's React binding: each action is one pure transition from ./logic. */
export const useGratitudeStore = create<GratitudeState>()(
  persist(
    (set) => ({
      entries: {},
      tombstones: {},

      saveEntry: (forDate, text) =>
        set((gratitude) => logic.saveEntry(gratitude, forDate, text, nowStamp())),
      replaceGratitude: (gratitude) => set(gratitude),
      mergeGratitude: (remote) => set((gratitude) => logic.mergeGratitude(gratitude, remote)),
    }),
    persistOptions<GratitudeState>('gratitude', {
      version: 2,
      // v1 had no tombstones (ADR 0005).
      migrate: (persisted, version) => {
        const { entries } = persisted as { entries: GratitudeEntries };
        return (version < 2 ? { entries, tombstones: {} } : persisted) as GratitudeState;
      },
    }),
  ),
);
