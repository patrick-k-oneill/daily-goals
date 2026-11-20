import type { PadData } from './types';

/** Bytes each store's persisted data takes on this device, as UTF-8 JSON. */
export interface StorageFootprint {
  goals: number;
  gratitude: number;
  total: number;
}

/**
 * Size of the pad as zustand persists it: one JSON document per store. The
 * persist envelope (`{"state":…,"version":n}`) adds ~25 bytes per store and
 * is left out, so these are the numbers the data itself is responsible for.
 */
export function storageFootprint(pad: PadData): StorageFootprint {
  const goals = jsonBytes(pad.goals);
  const gratitude = jsonBytes(pad.gratitude);
  return { goals, gratitude, total: goals + gratitude };
}

function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
