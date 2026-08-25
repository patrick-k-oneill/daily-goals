import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/lib/persisted-store';

import * as logic from './logic';
import type { UpcomingEvent } from './types';

interface EventsState {
  events: UpcomingEvent[];
  addEvent: (input: logic.EventInput) => void;
  updateEvent: (id: string, patch: logic.EventPatch) => void;
  removeEvent: (id: string) => void;
}

/** The events feature's React binding: each action is one pure transition from ./logic. */
export const useEventsStore = create<EventsState>()(
  persist(
    (set) => ({
      events: [],

      addEvent: (input) => set((s) => ({ events: logic.addEvent(s.events, input) })),
      updateEvent: (id, patch) => set((s) => ({ events: logic.updateEvent(s.events, id, patch) })),
      removeEvent: (id) => set((s) => ({ events: logic.removeEvent(s.events, id) })),
    }),
    persistOptions('events'),
  ),
);
