import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';
import type { DayKey } from '@/lib/dates';

import type { GratitudeEntry } from './types';

interface GratitudeState {
  hydrated: boolean;
  entries: Record<DayKey, GratitudeEntry>;
  setHydrated: () => void;
  saveEntry: (forDate: DayKey, text: string) => void;
  deleteEntry: (forDate: DayKey) => void;
}

export const useGratitudeStore = create<GratitudeState>()(
  persist(
    (set) => ({
      hydrated: false,
      entries: {},

      setHydrated: () => set({ hydrated: true }),

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
    {
      name: 'daily-goals/gratitude',
      version: 1,
      storage: appStorage(),
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
