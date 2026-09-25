import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { nowStamp } from '@/lib/clock';
import { persistOptions } from '@/lib/persisted-store';

import * as logic from './logic';
import type { LegacyUpcomingEvent, UpcomingEvents } from './types';

interface EventsState extends UpcomingEvents {
  addEvent: (input: logic.EventInput) => void;
  updateEvent: (id: string, patch: logic.EventPatch) => void;
  removeEvent: (id: string) => void;
  /** Replace every jotting with an imported pad's. */
  replaceEvents: (upcoming: UpcomingEvents) => void;
  /** Reconcile with another device's copy. */
  mergeEvents: (remote: UpcomingEvents) => void;
}

/** The events feature's React binding: each action is one pure transition from ./logic. */
export const useEventsStore = create<EventsState>()(
  persist(
    (set) => ({
      events: [],
      tombstones: {},

      addEvent: (input) => set((upcoming) => logic.addEvent(upcoming, input, nowStamp())),
      updateEvent: (id, patch) =>
        set((upcoming) => logic.updateEvent(upcoming, id, patch, nowStamp())),
      removeEvent: (id) => set((upcoming) => logic.removeEvent(upcoming, id, nowStamp())),
      replaceEvents: (upcoming) => set(upcoming),
      mergeEvents: (remote) => set((upcoming) => logic.mergeEvents(upcoming, remote)),
    }),
    persistOptions<EventsState>('events', {
      version: 2,
      // v1 had no stamps or tombstones (ADR 0005).
      migrate: (persisted, version) => {
        const { events } = persisted as { events: LegacyUpcomingEvent[] };
        return (
          version < 2 ? logic.upgradeLegacyEvents(events, nowStamp()) : persisted
        ) as EventsState;
      },
    }),
  ),
);
