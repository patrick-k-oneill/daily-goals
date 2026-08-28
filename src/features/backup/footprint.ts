import type { PadData } from './types';

/** Bytes each store's persisted data takes on this device, as UTF-8 JSON. */
export interface StorageFootprint {
  goals: number;
  gratitude: number;
  events: number;
  total: number;
}

/**
 * Size of the pad as zustand persists it: one JSON document per store. The
 * persist envelope (`{"state":…,"version":n}`) adds ~25 bytes per store and
 * is left out, so these are the numbers the data itself is responsible for.
 */
export function storageFootprint(pad: PadData): StorageFootprint {
  const goals = jsonBytes(pad.goals);
  const gratitude = jsonBytes({ entries: pad.gratitude });
  const events = jsonBytes({ events: pad.events });
  return { goals, gratitude, events, total: goals + gratitude + events };
}

/** "812 B", "12 KB", "1.5 MB" — decimal units, the way iOS Settings reports storage. */
export function formatBytes(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
