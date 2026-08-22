import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { newId } from '@/lib/id';
import { appStorage } from '@/lib/storage';
import type { DayKey } from '@/lib/dates';

import type { UpcomingEvent } from './types';

interface EventsState {
  hydrated: boolean;
  events: UpcomingEvent[];
  setHydrated: () => void;
  addEvent: (input: { date: DayKey; title: string; timeLabel?: string }) => void;
  removeEvent: (id: string) => void;
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set) => ({
      hydrated: false,
      events: [],

      setHydrated: () => set({ hydrated: true }),

      addEvent: ({ date, title, timeLabel }) =>
        set((state) => {
          const trimmed = title.trim();
          if (!trimmed) return state;
          return {
            events: [
              ...state.events,
              { id: newId(), date, title: trimmed, timeLabel: timeLabel?.trim() || undefined },
            ],
          };
        }),

      removeEvent: (id) => set((state) => ({ events: state.events.filter((e) => e.id !== id) })),
    }),
    {
      name: 'daily-goals/events',
      version: 1,
      storage: appStorage(),
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Events from `fromDate` on, soonest first. */
export function upcomingEvents(events: UpcomingEvent[], fromDate: DayKey): UpcomingEvent[] {
  return events
    .filter((e) => e.date >= fromDate)
    .sort((a, b) =>
      a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? -1 : 1,
    );
}
