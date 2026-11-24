import { useEffect } from 'react';
import { create } from 'zustand';

import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';
import type { Stamp } from '@/lib/merge';
import { whenHydrated } from '@/lib/persisted-store';

import { cloudPad } from './cloud';
import { startSync, type SyncEngine, type SyncReporter } from './engine';
import type { SyncPhase } from './types';

interface SyncState extends SyncReporter {
  phase: SyncPhase;
  /** The last moment this device's pad and the cloud pad were known to agree. */
  lastSyncedAt: Stamp | null;
  /** What the last run tripped over, while the phase is `error`. */
  problem: string | null;
}

/** Where sync stands, for Settings: this session's only, never persisted. */
export const useSyncStore = create<SyncState>()((set) => ({
  phase: 'starting',
  lastSyncedAt: null,
  problem: null,

  syncing: () => set({ phase: 'syncing', problem: null }),
  synced: (at) => set({ phase: 'synced', lastSyncedAt: at, problem: null }),
  unavailable: () => set({ phase: 'unavailable', problem: null }),
  failed: (problem) => set({ phase: 'error', problem }),
}));

const padStores = [useGoalsStore, useGratitudeStore];
let engine: SyncEngine | null = null;
let holders = 0;

/** The one engine this app runs: the device has a single watch on the pad directory. */
function holdEngine(): SyncEngine {
  engine ??= startSync(cloudPad, useSyncStore.getState());
  holders += 1;
  return engine;
}

function releaseEngine() {
  holders -= 1;
  if (holders > 0) return;
  engine?.stop();
  engine = null;
}

/** Run the engine for as long as the pad is open, from the moment every store has rehydrated. */
export function useSyncEngine(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    holdEngine();
    return releaseEngine;
  }, [ready]);
}

/**
 * Pull and push once, whether or not the pad is open: through the open pad's
 * engine when there is one, otherwise through one run just for this. Waits for
 * the pad to rehydrate first, so a pad that has not been read is never synced.
 * Resolves to where sync stood when the run ended.
 */
export async function syncNow(): Promise<SyncPhase> {
  await whenHydrated(padStores);
  await holdEngine().pull().finally(releaseEngine);
  return useSyncStore.getState().phase;
}
