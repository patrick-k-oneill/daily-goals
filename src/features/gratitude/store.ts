import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/lib/persisted-store';
import type { DayKey } from '@/lib/dates';

import * as logic from './logic';

interface GratitudeState {
  entries: logic.GratitudeEntries;
  saveEntry: (forDate: DayKey, text: string) => void;
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
    }),
    persistOptions('gratitude'),
  ),
);
