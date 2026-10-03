import { useEffect } from 'react';
import { create } from 'zustand';

import type { Stamp } from '@/lib/merge';

import { cloudPad } from './cloud';
import { startSync, type SyncReporter } from './engine';
import type { SyncPhase } from './types';

interface SyncState extends SyncReporter {
  phase: SyncPhase;
  /** The last moment this device's pad and the cloud pad were known to agree. */
  lastSyncedAt: Stamp | null;
  /** What the last run tripped over, while the phase is `error`. */
  problem: string | null;
}

/** Where sync stands, for the Pad footer: this session's only, never persisted. */
export const useSyncStore = create<SyncState>()((set) => ({
  phase: 'starting',
  lastSyncedAt: null,
  problem: null,

  syncing: () => set({ phase: 'syncing', problem: null }),
  synced: (at) => set({ phase: 'synced', lastSyncedAt: at, problem: null }),
  unavailable: () => set({ phase: 'unavailable', problem: null }),
  failed: (problem) => set({ phase: 'error', problem }),
}));

/** Run the engine for as long as the pad is open, from the moment every store has rehydrated. */
export function useSyncEngine(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    return startSync(cloudPad, useSyncStore.getState());
  }, [ready]);
}
