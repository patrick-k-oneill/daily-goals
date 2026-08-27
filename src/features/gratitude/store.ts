import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/lib/persisted-store';
import type { DayKey } from '@/lib/dates';

import * as logic from './logic';

interface GratitudeState {
  entries: logic.GratitudeEntries;
  saveEntry: (forDate: DayKey, text: string) => void;
  /** Replace every morning with an imported pad's. */
  replaceEntries: (entries: logic.GratitudeEntries) => void;
}

/** The gratitude feature's React binding: each action is one pure transition from ./logic. */
export const useGratitudeStore = create<GratitudeState>()(
  persist(
    (set) => ({
      entries: {},

      saveEntry: (forDate, text) =>
        set((s) => ({
          entries: logic.saveEntry(s.entries, forDate, text, new Date().toISOString()),
        })),
      replaceEntries: (entries) => set({ entries }),
    }),
    persistOptions('gratitude'),
  ),
);
