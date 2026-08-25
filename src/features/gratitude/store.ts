import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/lib/persisted-store';
import type { DayKey } from '@/lib/dates';

import type { GratitudeEntry } from './types';

interface GratitudeState {
  entries: Record<DayKey, GratitudeEntry>;
  saveEntry: (forDate: DayKey, text: string) => void;
  deleteEntry: (forDate: DayKey) => void;
}

export const useGratitudeStore = create<GratitudeState>()(
  persist(
    (set) => ({
      entries: {},

      saveEntry: (forDate, text) =>
        set((state) => {
          if (!text.trim()) {
            const { [forDate]: _removed, ...rest } = state.entries;
            return { entries: rest };
          }
          return {
            entries: {
              ...state.entries,
              [forDate]: { forDate, writtenAt: new Date().toISOString(), text },
            },
          };
        }),

      deleteEntry: (forDate) =>
        set((state) => {
          const { [forDate]: _removed, ...rest } = state.entries;
          return { entries: rest };
        }),
    }),
    persistOptions('gratitude'),
  ),
);
