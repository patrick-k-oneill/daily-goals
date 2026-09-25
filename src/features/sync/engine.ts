import { AppState } from 'react-native';

import { readPad } from '@/features/backup/pad';
import type { PadData } from '@/features/backup/types';
import { useEventsStore } from '@/features/events/store';
import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';
import { nowStamp } from '@/lib/clock';
import type { Stamp } from '@/lib/merge';

import { changedPaths, joinPad, separateCopies, splitPad } from './logic';
import type { CloudBinding, CloudFiles } from './types';

/** Where the engine tells the pad how sync stands. */
export interface SyncReporter {
  syncing(): void;
  synced(at: Stamp): void;
  unavailable(): void;
  failed(problem: string): void;
}

export interface SyncOptions {
  /** How long after the last local write before it is pushed. */
  pushDelayMs?: number;
  /** How long after the last cloud change before it is pulled. */
  pullDelayMs?: number;
}

type Run = 'pull' | 'push';

/**
 * The engine (ADR 0006): pull the cloud pad and merge it in, then push what
 * the cloud doesn't hold yet. It pulls at start, on return to the foreground,
 * when another device writes and when iCloud availability changes; a push
 * waits a moment after the last local write. One run at a time, a pull asked
 * for mid-run following it — and nothing is pushed before the cloud has been
 * read once, so a fresh device never writes over a pad it hasn't seen.
 */
export function startSync(
  cloud: CloudBinding,
  report: SyncReporter,
  options: SyncOptions = {},
): () => void {
  const pushDelay = options.pushDelayMs ?? 2000;
  const pullDelay = options.pullDelayMs ?? 1000;

  let lastCloud: CloudFiles = {};
  let unreadable: string[] = [];
  let seenCloud = false;
  let applying = false;
  let inFlight: Promise<void> | null = null;
  let pending: Run | null = null;
  const timers: Partial<Record<Run, ReturnType<typeof setTimeout>>> = {};

  async function pull(): Promise<void> {
    if (!(await cloud.isAvailable())) return report.unavailable();
    report.syncing();
    const { files, skipped } = await cloud.readAll();
    const { current, copies } = separateCopies(files);
    const joined = joinPad(current);
    applyRemote(joined.pad);
    for (const copy of copies) applyRemote(joinPad(copy).pad);
    lastCloud = current;
    unreadable = [...joined.unreadable, ...skipped];
    seenCloud = true;
    await push();
  }

  async function push(): Promise<void> {
    if (!seenCloud) return pull();
    if (!(await cloud.isAvailable())) return report.unavailable();
    const next = splitPad(readPad());
    const paths = changedPaths(lastCloud, next, unreadable);
    if (paths.length > 0) report.syncing();
    for (const path of paths) {
      await cloud.write(path, next[path]);
      lastCloud = { ...lastCloud, [path]: next[path] };
    }
    report.synced(nowStamp());
  }

  /** Merge another copy of the pad into every store; the stores' own writes stay theirs. */
  function applyRemote(remote: PadData) {
    applying = true;
    try {
      useGoalsStore.getState().mergeGoals(remote.goals);
      useGratitudeStore.getState().mergeGratitude(remote.gratitude);
      useEventsStore.getState().mergeEvents(remote.events);
    } finally {
      applying = false;
    }
  }

  function request(run: Run) {
    if (inFlight) {
      pending = run === 'pull' || pending === 'pull' ? 'pull' : 'push';
      return;
    }
    inFlight = (run === 'pull' ? pull() : push())
      .catch((error: unknown) => report.failed(describe(error)))
      .finally(() => {
        inFlight = null;
        const next = pending;
        pending = null;
        if (next) request(next);
      });
  }

  function schedule(run: Run, delay: number) {
    clearTimeout(timers[run]);
    timers[run] = setTimeout(() => request(run), delay);
  }

  const unsubscribes = [
    cloud.subscribe((event) => {
      if (event === 'changed') schedule('pull', pullDelay);
      else request('pull');
    }),
    ...[useGoalsStore, useGratitudeStore, useEventsStore].map((store) =>
      store.subscribe(() => {
        if (!applying) schedule('push', pushDelay);
      }),
    ),
  ];
  const foreground = AppState.addEventListener('change', (state) => {
    if (state === 'active') request('pull');
  });

  cloud.start().then(
    () => request('pull'),
    (error: unknown) => report.failed(describe(error)),
  );

  return () => {
    Object.values(timers).forEach((timer) => clearTimeout(timer));
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    foreground.remove();
    cloud.stop();
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
